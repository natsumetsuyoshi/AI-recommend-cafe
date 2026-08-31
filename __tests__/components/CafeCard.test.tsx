import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { CafeCard } from "@/components/CafeCard";
import type { Cafe, Recommendation } from "@/types";

function makeRecommendation(cafeOverrides: Partial<Cafe> = {}): Recommendation {
  return {
    cafe: {
      id: "cafe-1",
      name: "しずか珈琲店",
      lat: 35.68,
      lng: 139.76,
      rating: 4.6,
      userRatingCount: 312,
      priceLevel: 2,
      isOpenNow: true,
      address: "東京都千代田区丸の内1-2-3",
      reviewExcerpts: ["静かで作業がはかどる"],
      ...cafeOverrides,
    },
    reason: "静かに集中したいなら、この店の落ち着いた雰囲気が合いそうです。",
  };
}

describe("CafeCard", () => {
  it("店名を見出しとして表示する", () => {
    render(<CafeCard recommendation={makeRecommendation()} rank={1} />);

    expect(screen.getByRole("heading")).toHaveTextContent("しずか珈琲店");
  });

  it("理由を表示する", () => {
    render(<CafeCard recommendation={makeRecommendation()} rank={1} />);

    expect(
      screen.getByText(/静かに集中したいなら、この店の落ち着いた雰囲気/),
    ).toBeInTheDocument();
  });

  it("評価と件数を表示する", () => {
    render(<CafeCard recommendation={makeRecommendation()} rank={1} />);

    expect(screen.getByText("★ 4.6（312件）")).toBeInTheDocument();
  });

  it("住所を表示する", () => {
    render(<CafeCard recommendation={makeRecommendation()} rank={1} />);

    expect(screen.getByText("東京都千代田区丸の内1-2-3")).toBeInTheDocument();
  });

  it("順位を表示する", () => {
    render(<CafeCard recommendation={makeRecommendation()} rank={2} />);

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("営業中を表示する", () => {
    render(<CafeCard recommendation={makeRecommendation()} rank={1} />);

    expect(screen.getByText("営業中")).toBeInTheDocument();
  });

  it("営業時間外を表示する", () => {
    render(
      <CafeCard recommendation={makeRecommendation({ isOpenNow: false })} rank={1} />,
    );

    expect(screen.getByText("営業時間外")).toBeInTheDocument();
  });

  describe("欠損しているフィールド", () => {
    it("評価が無くても落ちない", () => {
      render(
        <CafeCard
          recommendation={makeRecommendation({ rating: null, userRatingCount: null })}
          rank={1}
        />,
      );

      expect(screen.getByRole("heading")).toHaveTextContent("しずか珈琲店");
      expect(screen.queryByText(/★/)).not.toBeInTheDocument();
    });

    it("価格帯が無くても落ちない", () => {
      render(
        <CafeCard recommendation={makeRecommendation({ priceLevel: null })} rank={1} />,
      );

      expect(screen.queryByText(/¥/)).not.toBeInTheDocument();
    });

    it("営業状況が不明なら何も出さない", () => {
      render(
        <CafeCard recommendation={makeRecommendation({ isOpenNow: null })} rank={1} />,
      );

      expect(screen.queryByText("営業中")).not.toBeInTheDocument();
      expect(screen.queryByText("営業時間外")).not.toBeInTheDocument();
    });

    it("評価件数だけ欠けていても評価は出す", () => {
      render(
        <CafeCard
          recommendation={makeRecommendation({ userRatingCount: null })}
          rank={1}
        />,
      );

      expect(screen.getByText("★ 4.6")).toBeInTheDocument();
    });
  });
});
