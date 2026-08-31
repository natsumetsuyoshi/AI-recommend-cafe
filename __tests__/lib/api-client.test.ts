import { describe, it, expect, vi, afterEach } from "vitest";

import { requestRecommendations } from "@/lib/api-client";
import type { RecommendRequest, Recommendation } from "@/types";

const request: RecommendRequest = {
  mood: "静かに集中したい",
  lat: 35.681236,
  lng: 139.767125,
  localHour: 14,
};

const recommendation: Recommendation = {
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
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestRecommendations", () => {
  it("成功したら ok: true と推薦一覧を返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ recommendations: [recommendation] }),
      }),
    );

    const result = await requestRecommendations(request);

    expect(result).toEqual({ ok: true, recommendations: [recommendation] });
  });

  it("POST で /api/recommend に JSON を送る", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await requestRecommendations(request);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/recommend");
    expect(init.method).toBe("POST");
    expect(init.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual(request);
  });

  it("recommendations が欠けていても空配列にする", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    );

    const result = await requestRecommendations(request);

    expect(result).toEqual({ ok: true, recommendations: [] });
  });

  it("エラーレスポンスから error.message を取り出す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: { code: "RATE_LIMIT_EXCEEDED", message: "リクエストが多すぎます。" },
        }),
      }),
    );

    const result = await requestRecommendations(request);

    expect(result).toEqual({ ok: false, message: "リクエストが多すぎます。" });
  });

  it("エラー応答が JSON でなければ既定文言にする", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => {
          throw new Error("JSON ではありません");
        },
      }),
    );

    const result = await requestRecommendations(request);

    expect(result).toMatchObject({ ok: false });
    expect(result).toHaveProperty("message", expect.stringContaining("おすすめを取得できませんでした"));
  });

  it("error.message が文字列でなければ既定文言にする", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: { code: "X", message: { nested: "object" } } }),
      }),
    );

    const result = await requestRecommendations(request);

    expect(result).toHaveProperty("message", expect.stringContaining("おすすめを取得できませんでした"));
  });

  it("fetch が reject したら通信失敗のメッセージにする", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ネットワーク断")));

    const result = await requestRecommendations(request);

    expect(result).toMatchObject({ ok: false });
    expect(result).toHaveProperty("message", expect.stringContaining("通信に失敗しました"));
  });

  it("例外を呼び出し元へ伝播させない", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ネットワーク断")));

    await expect(requestRecommendations(request)).resolves.toBeDefined();
  });
});
