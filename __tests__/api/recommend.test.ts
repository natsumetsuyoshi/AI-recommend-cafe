/**
 * `POST /api/recommend` のテスト。
 *
 * ここで見るのは HTTP の関心だけ: ステータスコード・レスポンス形式・
 * ヘッダ・情報漏れの有無。「推薦が何件か」「どの順で並ぶか」といった
 * ロジックは `__tests__/lib/recommend.test.ts` が見る。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { ExternalApiError } from "@/lib/errors";
import { DEFAULT_MAX_REQUESTS, resetRateLimits } from "@/lib/rate-limit";
import type { Recommendation } from "@/types";

vi.mock("@/lib/recommend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/recommend")>();
  return { ...actual, recommendCafes: vi.fn() };
});

const { recommendCafes } = await import("@/lib/recommend");
const { POST } = await import("@/app/api/recommend/route");

const validBody = {
  mood: "静かに集中したい",
  lat: 35.681236,
  lng: 139.767125,
  localHour: 14,
};

const RECOMMENDATIONS: Recommendation[] = [
  {
    cafe: {
      id: "a",
      name: "しずか珈琲店",
      lat: 35.68,
      lng: 139.76,
      rating: 4.5,
      userRatingCount: 100,
      priceLevel: 2,
      isOpenNow: true,
      address: "東京都千代田区1-1-1",
      reviewExcerpts: ["静かで落ち着く"],
    },
    reason: "静かに集中できます。",
  },
];

function makeRequest(body: unknown, ip = "203.0.113.1"): Request {
  return new Request("http://localhost/api/recommend", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  resetRateLimits();
  vi.mocked(recommendCafes).mockReset().mockResolvedValue(RECOMMENDATIONS);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/recommend", () => {
  describe("正常系", () => {
    it("200 と { recommendations: [...] } を返す", async () => {
      const response = await POST(makeRequest(validBody));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        recommendations: RECOMMENDATIONS,
      });
    });

    it("検証済みの入力を recommendCafes へ渡す", async () => {
      await POST(makeRequest({ ...validBody, mood: "  ひと息つきたい  " }));

      // trim 済みの mood が渡ることで、検証が Route Handler で効いていることを確認する
      expect(recommendCafes).toHaveBeenCalledWith({
        mood: "ひと息つきたい",
        lat: validBody.lat,
        lng: validBody.lng,
        localHour: validBody.localHour,
      });
    });
  });

  describe("入力検証", () => {
    it("mood が空なら 400", async () => {
      const response = await POST(makeRequest({ ...validBody, mood: "" }));

      expect(response.status).toBe(400);
      const payload = await response.json();
      expect(payload.error.code).toBe("VALIDATION_ERROR");
    });

    it("mood が長すぎれば 400", async () => {
      const response = await POST(
        makeRequest({ ...validBody, mood: "あ".repeat(201) }),
      );

      expect(response.status).toBe(400);
    });

    it("座標が範囲外なら 400", async () => {
      const response = await POST(makeRequest({ ...validBody, lat: 120 }));

      expect(response.status).toBe(400);
    });

    it("localHour が範囲外なら 400", async () => {
      const response = await POST(makeRequest({ ...validBody, localHour: 24 }));

      expect(response.status).toBe(400);
    });

    it("JSON として壊れていれば 400", async () => {
      const response = await POST(makeRequest("{壊れた"));

      expect(response.status).toBe(400);
      const payload = await response.json();
      expect(payload.error.code).toBe("VALIDATION_ERROR");
    });

    it("検証に落ちたら recommendCafes を呼ばない", async () => {
      await POST(makeRequest({ ...validBody, mood: "" }));

      expect(recommendCafes).not.toHaveBeenCalled();
    });
  });

  describe("レート制限", () => {
    it("上限を超えると 429 を返す", async () => {
      for (let i = 0; i < DEFAULT_MAX_REQUESTS; i += 1) {
        await POST(makeRequest(validBody));
      }
      const blocked = await POST(makeRequest(validBody));

      expect(blocked.status).toBe(429);
      const payload = await blocked.json();
      expect(payload.error.code).toBe("RATE_LIMIT_EXCEEDED");
    });

    it("429 に Retry-After を付ける", async () => {
      for (let i = 0; i < DEFAULT_MAX_REQUESTS; i += 1) {
        await POST(makeRequest(validBody));
      }
      const blocked = await POST(makeRequest(validBody));

      expect(blocked.headers.get("Retry-After")).not.toBeNull();
    });

    it("IP が違えば別枠で数える", async () => {
      for (let i = 0; i < DEFAULT_MAX_REQUESTS; i += 1) {
        await POST(makeRequest(validBody, "203.0.113.1"));
      }
      const otherClient = await POST(makeRequest(validBody, "203.0.113.2"));

      expect(otherClient.status).toBe(200);
    });

    it("上限超過なら recommendCafes を呼ばない", async () => {
      for (let i = 0; i < DEFAULT_MAX_REQUESTS; i += 1) {
        await POST(makeRequest(validBody));
      }
      vi.mocked(recommendCafes).mockClear();

      await POST(makeRequest(validBody));

      expect(recommendCafes).not.toHaveBeenCalled();
    });
  });

  describe("例外の HTTP 変換", () => {
    it("ExternalApiError を 502 にする", async () => {
      vi.mocked(recommendCafes).mockRejectedValue(
        new ExternalApiError("周辺のカフェを取得できませんでした。", new Error("Places がダウン")),
      );
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const response = await POST(makeRequest(validBody));

      expect(response.status).toBe(502);
      const payload = await response.json();
      expect(payload.error.code).toBe("EXTERNAL_API_ERROR");
      consoleSpy.mockRestore();
    });

    it("外部APIの内部詳細をクライアントに返さない", async () => {
      vi.mocked(recommendCafes).mockRejectedValue(
        new ExternalApiError("取得できませんでした。", new Error("APIキー sk-secret が無効")),
      );
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const response = await POST(makeRequest(validBody));

      const raw = JSON.stringify(await response.json());
      expect(raw).not.toContain("sk-secret");
      consoleSpy.mockRestore();
    });

    it("原因はサーバーログにだけ出す", async () => {
      const cause = new Error("APIキー sk-secret が無効");
      vi.mocked(recommendCafes).mockRejectedValue(
        new ExternalApiError("取得できませんでした。", cause),
      );
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await POST(makeRequest(validBody));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[recommend]"),
        cause,
      );
      consoleSpy.mockRestore();
    });

    it("AppError 以外の例外は 500 にまとめる", async () => {
      vi.mocked(recommendCafes).mockRejectedValue(new TypeError("想定外の内部エラー"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const response = await POST(makeRequest(validBody));

      expect(response.status).toBe(500);
      const payload = await response.json();
      expect(payload.error.code).toBe("INTERNAL_ERROR");
      consoleSpy.mockRestore();
    });

    it("500 のとき例外メッセージをクライアントに返さない", async () => {
      vi.mocked(recommendCafes).mockRejectedValue(new TypeError("内部の秘密 leaked-detail"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const response = await POST(makeRequest(validBody));

      const raw = JSON.stringify(await response.json());
      expect(raw).not.toContain("leaked-detail");
      consoleSpy.mockRestore();
    });
  });
});
