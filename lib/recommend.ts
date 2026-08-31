import "server-only";

/**
 * おすすめカフェの生成。
 *
 * `POST /api/recommend` の中身。HTTP を知らないので、
 * Route Handler 以外（Server Action・スクリプト）からも同じロジックを呼べる。
 *
 * 入力の検証とレート制限は Route Handler の担当なので、ここでは扱わない。
 * この関数に渡ってくる `RecommendRequest` は検証済みである前提。
 */

import { generateRecommendations } from "@/lib/claude";
import { ExternalApiError } from "@/lib/errors";
import { searchNearbyCafes } from "@/lib/places";
import type { RecommendRequest, Recommendation } from "@/types";

/** 周辺カフェの検索半径（メートル）。徒歩圏に収める。 */
export const SEARCH_RADIUS_METERS = 800;

/** 推薦生成に渡す候補カフェの上限。多すぎると入力トークン＝コストが膨らむ。 */
export const MAX_CANDIDATE_CAFES = 20;

/** 利用者に返す推薦の件数（要件定義どおり3件）。 */
export const RECOMMENDATION_COUNT = 3;

/**
 * 周辺カフェを集め、気分に合う3件を理由つきで選ぶ。
 *
 * 外部サービスの失敗は `ExternalApiError` に包み直す。どのサービスが落ちたかは
 * 呼び出し側に伝えず、原因（`reason`）だけを持たせて上へ渡す。
 *
 * @param input - 検証済みのレコメンド要求
 * @returns 推薦（最大 `RECOMMENDATION_COUNT` 件）
 * @throws {ExternalApiError} 外部サービスの呼び出しに失敗したとき
 */
export async function recommendCafes(
  input: RecommendRequest,
): Promise<Recommendation[]> {
  let cafes;
  try {
    cafes = await searchNearbyCafes({
      lat: input.lat,
      lng: input.lng,
      radiusMeters: SEARCH_RADIUS_METERS,
      limit: MAX_CANDIDATE_CAFES,
    });
  } catch (error) {
    throw new ExternalApiError("周辺のカフェを取得できませんでした。", error);
  }

  try {
    return await generateRecommendations({
      mood: input.mood,
      localHour: input.localHour,
      cafes,
      limit: RECOMMENDATION_COUNT,
    });
  } catch (error) {
    throw new ExternalApiError("おすすめを生成できませんでした。", error);
  }
}
