"use client";

import { useCallback, useRef, useState } from "react";

import { resolveCurrentLocation } from "@/lib/geolocation";
import { requestRecommendations } from "@/lib/api-client";
import type { Recommendation } from "@/types";

/**
 * 気分入力からレコメンド表示までの画面状態。
 *
 * `recommendations` の `null` は「まだ送信していない」を意味し、
 * 空配列（0件）と区別する。表示側はこの違いで初期表示と「見つからなかった」を
 * 出し分ける。
 */
export interface MoodRecommenderState {
  /** 推薦一覧。未送信なら null、0件なら空配列 */
  recommendations: Recommendation[] | null;
  /** 利用者向けエラーメッセージ。エラーが無ければ null */
  errorMessage: string | null;
  /** 送信中かどうか */
  isSubmitting: boolean;
  /** 気分を送信しておすすめを取得する */
  submit: (mood: string) => Promise<void>;
}

/**
 * 気分入力画面のロジック。
 *
 * 状態遷移だけを持ち、現在地取得と API 呼び出しは `lib/` に委譲する。
 * JSX を持たないので、状態遷移は DOM 非依存でテストできる。
 */
export function useMoodRecommender(): MoodRecommenderState {
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * 二重送信の判定に使う。
   *
   * state は再レンダーまで更新されないため、`isSubmitting` で判定すると
   * 同一レンダー内で連続して呼ばれた場合に両方が通ってしまう。
   * ref なら代入が即座に見えるので、再レンダーを待たずに 2 回目を弾ける。
   */
  const isSubmittingRef = useRef(false);

  const submit = useCallback(async (mood: string) => {
    // 送信中の再送信は無視する（二重送信の防止）
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { lat, lng } = await resolveCurrentLocation();
      const result = await requestRecommendations({
        mood,
        lat,
        lng,
        localHour: new Date().getHours(),
      });

      if (result.ok) {
        setRecommendations(result.recommendations);
      } else {
        setRecommendations(null);
        setErrorMessage(result.message);
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, []);

  return { recommendations, errorMessage, isSubmitting, submit };
}
