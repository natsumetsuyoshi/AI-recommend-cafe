import { describe, it, expect, afterEach } from "vitest";

import {
  DEFAULT_CLAUDE_MODEL,
  generateRecommendations,
  resolveClaudeModel,
} from "@/lib/claude";
import type { Cafe, RecommendInput } from "@/types";

function makeCafe(id: string, rating: number | null, overrides: Partial<Cafe> = {}): Cafe {
  return {
    id,
    name: `カフェ${id}`,
    lat: 35.68,
    lng: 139.76,
    rating,
    userRatingCount: 100,
    priceLevel: 2,
    isOpenNow: true,
    address: "東京都千代田区1-1-1",
    reviewExcerpts: ["静かで落ち着く"],
    ...overrides,
  };
}

function makeInput(cafes: Cafe[], overrides: Partial<RecommendInput> = {}): RecommendInput {
  return {
    mood: "静かに集中したい",
    localHour: 14,
    cafes,
    limit: 3,
    ...overrides,
  };
}

describe("generateRecommendations", () => {
  it("limit の件数だけ返す", async () => {
    const cafes = [
      makeCafe("a", 4.0),
      makeCafe("b", 4.5),
      makeCafe("c", 3.8),
      makeCafe("d", 4.9),
    ];

    const recommendations = await generateRecommendations(makeInput(cafes));

    expect(recommendations).toHaveLength(3);
  });

  it("評価の高い順に選ぶ", async () => {
    const cafes = [
      makeCafe("a", 4.0),
      makeCafe("b", 4.5),
      makeCafe("c", 3.8),
      makeCafe("d", 4.9),
    ];

    const recommendations = await generateRecommendations(makeInput(cafes));

    expect(recommendations.map((item) => item.cafe.id)).toEqual(["d", "b", "a"]);
  });

  it("カフェが limit 未満でもある分だけ返す", async () => {

    const recommendations = await generateRecommendations(
      makeInput([makeCafe("a", 4.0), makeCafe("b", 4.2)]),
    );

    expect(recommendations).toHaveLength(2);
  });

  it("カフェが0件なら空を返す", async () => {

    const recommendations = await generateRecommendations(makeInput([]));

    expect(recommendations).toEqual([]);
  });

  it("評価が無い店は後ろに回す", async () => {
    const cafes = [makeCafe("noRating", null), makeCafe("rated", 3.0)];

    const recommendations = await generateRecommendations(makeInput(cafes));

    expect(recommendations[0].cafe.id).toBe("rated");
  });

  it("理由に気分と店名を織り込む", async () => {

    const [recommendation] = await generateRecommendations(
      makeInput([makeCafe("a", 4.0)], { mood: "ひと息つきたい" }),
    );

    expect(recommendation.reason).toContain("ひと息つきたい");
    expect(recommendation.reason).toContain("カフェa");
  });

  it("レビューが無くても理由を組み立てられる", async () => {
    const cafe = makeCafe("a", 4.0, { reviewExcerpts: [] });

    const [recommendation] = await generateRecommendations(makeInput([cafe]));

    expect(recommendation.reason).not.toBe("");
  });

  it("営業時間外の店にはその旨を添える", async () => {
    const cafe = makeCafe("a", 4.0, { isOpenNow: false });

    const [recommendation] = await generateRecommendations(makeInput([cafe]));

    expect(recommendation.reason).toContain("営業時間外");
  });
});

describe("resolveClaudeModel", () => {
  const originalModel = process.env.CLAUDE_MODEL;

  afterEach(() => {
    if (originalModel === undefined) {
      delete process.env.CLAUDE_MODEL;
    } else {
      process.env.CLAUDE_MODEL = originalModel;
    }
  });

  it("未設定なら Sonnet 5 を使う", () => {
    delete process.env.CLAUDE_MODEL;

    expect(resolveClaudeModel()).toBe(DEFAULT_CLAUDE_MODEL);
    expect(DEFAULT_CLAUDE_MODEL).toBe("claude-sonnet-5");
  });

  it("環境変数で差し替えられる", () => {
    process.env.CLAUDE_MODEL = "claude-haiku-4-5";

    expect(resolveClaudeModel()).toBe("claude-haiku-4-5");
  });

  it("空文字なら既定値に戻す", () => {
    process.env.CLAUDE_MODEL = "   ";

    expect(resolveClaudeModel()).toBe(DEFAULT_CLAUDE_MODEL);
  });
});
