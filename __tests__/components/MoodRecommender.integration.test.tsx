/**
 * component → hook → api-client → fetch の配線を通しで見る統合テスト。
 *
 * 各層の詳細はそれぞれのユニットテストが見る。ここで守りたいのは
 * 「層を分けたことで繋ぎ目が外れていないか」だけなので、代表経路に絞る。
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { MoodRecommender } from "@/components/MoodRecommender";
import type { Recommendation } from "@/types";

const TOKYO_STATION = { lat: 35.681236, lng: 139.767125 };

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

/** Geolocation が拒否される形でモックする。 */
function mockGeolocationDenied() {
  vi.stubGlobal("navigator", {
    ...navigator,
    geolocation: {
      getCurrentPosition: vi.fn(
        (_onSuccess: PositionCallback, onError: PositionErrorCallback) => {
          onError({ code: 1, message: "拒否されました" } as GeolocationPositionError);
        },
      ),
    },
  });
}

async function submitMood(mood: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("いまの気分は？"), mood);
  await user.click(screen.getByRole("button", { name: "カフェを探す" }));
}

beforeEach(() => {
  vi.stubGlobal("navigator", {
    ...navigator,
    geolocation: {
      getCurrentPosition: vi.fn((onSuccess: PositionCallback) => {
        onSuccess({
          coords: { latitude: TOKYO_STATION.lat, longitude: TOKYO_STATION.lng },
        } as GeolocationPosition);
      }),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("MoodRecommender（統合）", () => {
  it("送信するとカードが表示される", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ recommendations: THREE_RECOMMENDATIONS }),
      }),
    );
    render(<MoodRecommender />);

    await submitMood("静かに集中したい");

    await waitFor(() => {
      expect(screen.getByText("しずか珈琲店")).toBeInTheDocument();
    });
    expect(screen.getByText("夜まちスタンド")).toBeInTheDocument();
  });

  it("気分・座標・ローカル時刻が API へ届く", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: THREE_RECOMMENDATIONS }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<MoodRecommender />);

    await submitMood("ひと息つきたい");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/recommend");
    const body = JSON.parse(init.body);
    expect(body.mood).toBe("ひと息つきたい");
    expect(body.lat).toBe(TOKYO_STATION.lat);
    expect(body.lng).toBe(TOKYO_STATION.lng);
    expect(body.localHour).toBeGreaterThanOrEqual(0);
    expect(body.localHour).toBeLessThanOrEqual(23);
  });

  it("位置情報を拒否されても既定座標で結果が出る", async () => {
    mockGeolocationDenied();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: THREE_RECOMMENDATIONS }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<MoodRecommender />);

    await submitMood("静かに集中したい");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).lat).toBe(TOKYO_STATION.lat);
    await waitFor(() => {
      expect(screen.getByText("しずか珈琲店")).toBeInTheDocument();
    });
  });

  it("API エラーのメッセージが画面に出る", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: { code: "RATE_LIMIT_EXCEEDED", message: "リクエストが多すぎます。" },
        }),
      }),
    );
    render(<MoodRecommender />);

    await submitMood("静かに集中したい");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("リクエストが多すぎます。");
    });
  });

  it("通信に失敗したらメッセージが出る", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ネットワーク断")));
    render(<MoodRecommender />);

    await submitMood("静かに集中したい");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("通信に失敗しました");
    });
  });

  it("0件なら見つからなかった旨が出る", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ recommendations: [] }) }),
    );
    render(<MoodRecommender />);

    await submitMood("静かに集中したい");

    await waitFor(() => {
      expect(
        screen.getByText(/近くに条件に合うカフェが見つかりませんでした/),
      ).toBeInTheDocument();
    });
  });
});
