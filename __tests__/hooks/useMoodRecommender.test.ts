import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useMoodRecommender } from "@/hooks/useMoodRecommender";
import type { Recommendation } from "@/types";

vi.mock("@/lib/geolocation", () => ({
  FALLBACK_LOCATION: { lat: 35.681236, lng: 139.767125 },
  resolveCurrentLocation: vi.fn(async () => ({ lat: 35.681236, lng: 139.767125 })),
}));

vi.mock("@/lib/api-client", () => ({
  requestRecommendations: vi.fn(),
}));

const { resolveCurrentLocation } = await import("@/lib/geolocation");
const { requestRecommendations } = await import("@/lib/api-client");

function makeRecommendation(id: string): Recommendation {
  return {
    cafe: {
      id,
      name: `カフェ${id}`,
      lat: 35.68,
      lng: 139.76,
      rating: 4.5,
      userRatingCount: 100,
      priceLevel: 2,
      isOpenNow: true,
      address: "東京都千代田区1-1-1",
      reviewExcerpts: ["静かで落ち着く"],
    },
    reason: "合いそうです。",
  };
}

const RECOMMENDATIONS = [makeRecommendation("a"), makeRecommendation("b")];

beforeEach(() => {
  vi.mocked(requestRecommendations).mockResolvedValue({
    ok: true,
    recommendations: RECOMMENDATIONS,
  });
  vi.mocked(resolveCurrentLocation).mockResolvedValue({
    lat: 35.681236,
    lng: 139.767125,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useMoodRecommender", () => {
  it("初期状態は未送信", () => {
    const { result } = renderHook(() => useMoodRecommender());

    expect(result.current.recommendations).toBeNull();
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it("成功したら推薦をセットする", async () => {
    const { result } = renderHook(() => useMoodRecommender());

    await act(async () => {
      await result.current.submit("静かに集中したい");
    });

    expect(result.current.recommendations).toEqual(RECOMMENDATIONS);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it("送信中は isSubmitting が true になる", async () => {
    let resolveRequest: (value: { ok: true; recommendations: Recommendation[] }) => void;
    vi.mocked(requestRecommendations).mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const { result } = renderHook(() => useMoodRecommender());

    act(() => {
      void result.current.submit("静かに集中したい");
    });

    await waitFor(() => expect(result.current.isSubmitting).toBe(true));

    await act(async () => {
      resolveRequest!({ ok: true, recommendations: RECOMMENDATIONS });
    });

    expect(result.current.isSubmitting).toBe(false);
  });

  it("気分・座標・ローカル時刻をクライアントへ渡す", async () => {
    const { result } = renderHook(() => useMoodRecommender());

    await act(async () => {
      await result.current.submit("ひと息つきたい");
    });

    const passed = vi.mocked(requestRecommendations).mock.calls[0][0];
    expect(passed.mood).toBe("ひと息つきたい");
    expect(passed.lat).toBe(35.681236);
    expect(passed.lng).toBe(139.767125);
    expect(passed.localHour).toBeGreaterThanOrEqual(0);
    expect(passed.localHour).toBeLessThanOrEqual(23);
  });

  it("失敗したらエラーメッセージをセットし推薦を消す", async () => {
    vi.mocked(requestRecommendations).mockResolvedValue({
      ok: false,
      message: "リクエストが多すぎます。",
    });
    const { result } = renderHook(() => useMoodRecommender());

    await act(async () => {
      await result.current.submit("静かに集中したい");
    });

    expect(result.current.recommendations).toBeNull();
    expect(result.current.errorMessage).toBe("リクエストが多すぎます。");
    expect(result.current.isSubmitting).toBe(false);
  });

  it("再送信でエラー表示を消してから取得する", async () => {
    vi.mocked(requestRecommendations)
      .mockResolvedValueOnce({ ok: false, message: "失敗しました。" })
      .mockResolvedValueOnce({ ok: true, recommendations: RECOMMENDATIONS });
    const { result } = renderHook(() => useMoodRecommender());

    await act(async () => {
      await result.current.submit("静かに集中したい");
    });
    expect(result.current.errorMessage).toBe("失敗しました。");

    await act(async () => {
      await result.current.submit("静かに集中したい");
    });

    expect(result.current.errorMessage).toBeNull();
    expect(result.current.recommendations).toEqual(RECOMMENDATIONS);
  });

  it("0件でも空配列としてセットする（未送信と区別する）", async () => {
    vi.mocked(requestRecommendations).mockResolvedValue({
      ok: true,
      recommendations: [],
    });
    const { result } = renderHook(() => useMoodRecommender());

    await act(async () => {
      await result.current.submit("静かに集中したい");
    });

    expect(result.current.recommendations).toEqual([]);
  });

  it("送信中の再送信を無視する", async () => {
    let resolveRequest: (value: { ok: true; recommendations: Recommendation[] }) => void;
    vi.mocked(requestRecommendations).mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const { result } = renderHook(() => useMoodRecommender());

    act(() => {
      void result.current.submit("静かに集中したい");
    });
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));

    await act(async () => {
      await result.current.submit("二度目");
    });

    expect(requestRecommendations).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRequest!({ ok: true, recommendations: RECOMMENDATIONS });
    });
  });

  it("再レンダーを挟まない連続呼び出しでも1回しか実行しない", async () => {
    let resolveRequest: (value: { ok: true; recommendations: Recommendation[] }) => void;
    vi.mocked(requestRecommendations).mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const { result } = renderHook(() => useMoodRecommender());

    // 同じレンダーが持つ submit を、間に再レンダーを挟まず続けて呼ぶ。
    // isSubmitting（state）で判定していると両方とも素通りしてしまう。
    act(() => {
      void result.current.submit("一度目");
      void result.current.submit("二度目");
    });

    await waitFor(() => expect(result.current.isSubmitting).toBe(true));

    expect(requestRecommendations).toHaveBeenCalledTimes(1);
    expect(vi.mocked(requestRecommendations).mock.calls[0][0].mood).toBe("一度目");

    await act(async () => {
      resolveRequest!({ ok: true, recommendations: RECOMMENDATIONS });
    });
  });

  it("位置情報が取れなくてもクライアント呼び出しへ進む", async () => {
    vi.mocked(resolveCurrentLocation).mockResolvedValue({
      lat: 35.681236,
      lng: 139.767125,
    });
    const { result } = renderHook(() => useMoodRecommender());

    await act(async () => {
      await result.current.submit("静かに集中したい");
    });

    expect(resolveCurrentLocation).toHaveBeenCalled();
    expect(requestRecommendations).toHaveBeenCalled();
  });
});
