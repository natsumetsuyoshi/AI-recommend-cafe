import "server-only";

/**
 * 周辺カフェの取得（Data Access Layer）。
 *
 * Google Places API キーを読むのはこのファイルだけ。
 * キーが未設定のあいだは開発用フィクスチャを返すので、
 * 外部通信も課金も発生しないままコア体験を通しで動かせる。
 *
 * 実API接続時は、この関数の中で `process.env.GOOGLE_PLACES_API_KEY` を見て
 * 分岐を足す。呼び出し側（`lib/recommend.ts`）は変更不要。
 */

import { FIXTURE_CAFES } from "@/lib/fixtures";
import type { Cafe, NearbySearchParams } from "@/types";

/**
 * 周辺のカフェを取得する。
 *
 * フィクスチャの座標は基準点からのオフセットを検索地点に足し直すので、
 * どこで検索しても「その場の周辺」にピンが並ぶ。
 *
 * @param params - 検索地点・半径・取得件数
 * @returns 検索地点の周辺に配置し直したカフェ一覧
 */
export async function searchNearbyCafes(params: NearbySearchParams): Promise<Cafe[]> {
  const cafes: Cafe[] = FIXTURE_CAFES.map((fixture) => ({
    id: fixture.id,
    name: fixture.name,
    lat: params.lat + fixture.latOffset,
    lng: params.lng + fixture.lngOffset,
    rating: fixture.rating,
    userRatingCount: fixture.userRatingCount,
    priceLevel: fixture.priceLevel,
    isOpenNow: fixture.isOpenNow,
    address: fixture.address,
    reviewExcerpts: [...fixture.reviewExcerpts],
  }));

  return cafes.slice(0, params.limit);
}
