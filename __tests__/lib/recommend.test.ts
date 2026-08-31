import { describe, it, expect, vi, beforeEach } from "vitest";

import { ExternalApiError } from "@/lib/errors";
import type { Cafe, RecommendRequest } from "@/types";

vi.mock("@/lib/places", () => ({ searchNearbyCafes: vi.fn() }));
vi.mock("@/lib/claude", () => ({ generateRecommendations: vi.fn() }));

const { searchNearbyCafes } = await import("@/lib/places");
const { generateRecommendations } = await import("@/lib/claude");
const {
  MAX_CANDIDATE_CAFES,
  RECOMMENDATION_COUNT,
  SEARCH_RADIUS_METERS,
  recommendCafes,
} = await import("@/lib/recommend");

const input: RecommendRequest = {
  mood: "静かに集中したい",
  lat: 35.681236,
  lng: 139.767125,
  localHour: 14,
};

function makeCafe(id: string): Cafe {
  return {
    id,
    name: `カフェ${id}`,
    lat: 35.68,
    lng: 139.76,
    rating: 4.2,
    userRatingCount: 100,
    priceLevel: 2,
    isOpenNow: true,
    address: "東京都千代田区1-1-1",
    reviewExcerpts: ["静かで落ち着く"],
  };
}

const CAFES = [makeCafe("a"), makeCafe("b"), makeCafe("c")];
const RECOMMENDATIONS = CAFES.map((cafe) => ({ cafe, reason: "合いそうです。" }));

beforeEach(() => {
  vi.mocked(searchNearbyCafes).mockReset().mockResolvedValue(CAFES);
  vi.mocked(generateRecommendations).mockReset().mockResolvedValue(RECOMMENDATIONS);
});

describe("recommendCafes", () => {
  describe("正常系", () => {
    it("生成された推薦をそのまま返す", async () => {
      await expect(recommendCafes(input)).resolves.toEqual(RECOMMENDATIONS);
    });

    it("検索地点・半径・候補上限を searchNearbyCafes へ渡す", async () => {
      await recommendCafes(input);

      expect(searchNearbyCafes).toHaveBeenCalledWith({
        lat: input.lat,
        lng: input.lng,
        radiusMeters: SEARCH_RADIUS_METERS,
        limit: MAX_CANDIDATE_CAFES,
      });
    });

    it("気分・時刻・候補カフェ・件数を generateRecommendations へ渡す", async () => {
      await recommendCafes(input);

      expect(generateRecommendations).toHaveBeenCalledWith({
        mood: input.mood,
        localHour: input.localHour,
        cafes: CAFES,
        limit: RECOMMENDATION_COUNT,
      });
    });

    it("推薦件数の既定は 3 件", () => {
      expect(RECOMMENDATION_COUNT).toBe(3);
    });

    it("検索半径は徒歩圏（800m）", () => {
      expect(SEARCH_RADIUS_METERS).toBe(800);
    });

    it("候補が 0 件でも推薦生成へ進む", async () => {
      vi.mocked(searchNearbyCafes).mockResolvedValue([]);
      vi.mocked(generateRecommendations).mockResolvedValue([]);

      await expect(recommendCafes(input)).resolves.toEqual([]);
      expect(generateRecommendations).toHaveBeenCalled();
    });
  });

  describe("外部サービスの失敗", () => {
    it("カフェ取得の失敗を ExternalApiError に包む", async () => {
      vi.mocked(searchNearbyCafes).mockRejectedValue(new Error("Places がダウン"));

      await expect(recommendCafes(input)).rejects.toBeInstanceOf(ExternalApiError);
    });

    it("推薦生成の失敗を ExternalApiError に包む", async () => {
      vi.mocked(generateRecommendations).mockRejectedValue(new Error("Claude がダウン"));

      await expect(recommendCafes(input)).rejects.toBeInstanceOf(ExternalApiError);
    });

    it("元の例外を reason として保持する（ログ用）", async () => {
      const cause = new Error("APIキーが無効");
      vi.mocked(searchNearbyCafes).mockRejectedValue(cause);

      await expect(recommendCafes(input)).rejects.toMatchObject({ reason: cause });
    });

    it("カフェ取得が失敗したら推薦生成を呼ばない", async () => {
      vi.mocked(searchNearbyCafes).mockRejectedValue(new Error("Places がダウン"));

      await expect(recommendCafes(input)).rejects.toThrow();
      expect(generateRecommendations).not.toHaveBeenCalled();
    });
  });
});
