/**
 * `MoodRecommender` の表示テスト。
 *
 * `useMoodRecommender` をモックし、状態ごとの見た目だけを検証する。
 * 状態遷移そのものは `__tests__/hooks/useMoodRecommender.test.ts`、
 * API 呼び出しは `__tests__/lib/api-client.test.ts` が見る。
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach } from "vitest";

import { MoodRecommender } from "@/components/MoodRecommender";
import type { MoodRecommenderState } from "@/hooks/useMoodRecommender";
import type { Recommendation } from "@/types";

vi.mock("@/hooks/useMoodRecommender", () => ({
  useMoodRecommender: vi.fn(),
}));

const { useMoodRecommender } = await import("@/hooks/useMoodRecommender");

function makeRecommendation(id: string, name: string): Recommendation {
  return {
    cafe: {
      id,
      name,
      lat: 35.68,
      lng: 139.76,
      rating: 4.5,
      userRatingCount: 100,
      priceLevel: 2,
      isOpenNow: true,
      address: "東京都千代田区1-1-1",
      reviewExcerpts: ["静かで落ち着く"],
    },
    reason: `${name}が気分に合いそうです。`,
  };
}

const THREE_RECOMMENDATIONS = [
  makeRecommendation("a", "しずか珈琲店"),
  makeRecommendation("b", "ひだまりロースターズ"),
  makeRecommendation("c", "夜まちスタンド"),
];

function stubHook(overrides: Partial<MoodRecommenderState> = {}) {
  const state: MoodRecommenderState = {
    recommendations: null,
    errorMessage: null,
    isSubmitting: false,
    submit: vi.fn(async () => {}),
    ...overrides,
  };
  vi.mocked(useMoodRecommender).mockReturnValue(state);
  return state;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("MoodRecommender", () => {
  describe("未送信", () => {
    it("結果もエラーも出さない", () => {
      stubHook();
      render(<MoodRecommender />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByText("あなたにおすすめの3軒")).not.toBeInTheDocument();
      expect(
        screen.queryByText(/近くに条件に合うカフェが見つかりませんでした/),
      ).not.toBeInTheDocument();
    });
  });

  describe("送信中", () => {
    it("探している旨を表示する", () => {
      stubHook({ isSubmitting: true });
      render(<MoodRecommender />);

      expect(screen.getByText(/気分に合うカフェを探しています/)).toBeInTheDocument();
    });

    it("直前の結果を出したままにしない", () => {
      stubHook({ isSubmitting: true, recommendations: THREE_RECOMMENDATIONS });
      render(<MoodRecommender />);

      expect(screen.queryByText("しずか珈琲店")).not.toBeInTheDocument();
    });
  });

  describe("結果あり", () => {
    it("推薦カードを順番に並べる", () => {
      stubHook({ recommendations: THREE_RECOMMENDATIONS });
      render(<MoodRecommender />);

      expect(screen.getByText("あなたにおすすめの3軒")).toBeInTheDocument();
      expect(screen.getByText("しずか珈琲店")).toBeInTheDocument();
      expect(screen.getByText("ひだまりロースターズ")).toBeInTheDocument();
      expect(screen.getByText("夜まちスタンド")).toBeInTheDocument();
    });

    it("理由を表示する", () => {
      stubHook({ recommendations: THREE_RECOMMENDATIONS });
      render(<MoodRecommender />);

      expect(
        screen.getByText("しずか珈琲店が気分に合いそうです。"),
      ).toBeInTheDocument();
    });
  });

  describe("結果 0 件", () => {
    it("見つからなかった旨を表示する", () => {
      stubHook({ recommendations: [] });
      render(<MoodRecommender />);

      expect(
        screen.getByText(/近くに条件に合うカフェが見つかりませんでした/),
      ).toBeInTheDocument();
      expect(screen.queryByText("あなたにおすすめの3軒")).not.toBeInTheDocument();
    });
  });

  describe("エラー", () => {
    it("メッセージを alert として表示する", () => {
      stubHook({ errorMessage: "リクエストが多すぎます。" });
      render(<MoodRecommender />);

      expect(screen.getByRole("alert")).toHaveTextContent("リクエストが多すぎます。");
    });
  });

  describe("入力との接続", () => {
    it("送信すると hook の submit を気分つきで呼ぶ", async () => {
      const hook = stubHook();
      render(<MoodRecommender />);

      const user = userEvent.setup();
      await user.type(screen.getByLabelText("いまの気分は？"), "静かに集中したい");
      await user.click(screen.getByRole("button", { name: "カフェを探す" }));

      expect(hook.submit).toHaveBeenCalledWith("静かに集中したい");
    });

    it("送信中は入力を無効にする", () => {
      stubHook({ isSubmitting: true });
      render(<MoodRecommender />);

      expect(screen.getByLabelText("いまの気分は？")).toBeDisabled();
    });
  });
});
