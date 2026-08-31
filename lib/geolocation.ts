/**
 * 現在地の取得。
 *
 * ブラウザの Geolocation API を呼び出し側から隠すためのラッパ。
 * 位置情報は「あれば嬉しい」情報なので、拒否・失敗・非対応・タイムアウトの
 * いずれでもエラーにせず既定座標へフォールバックする。
 */

/**
 * 位置情報が取れなかったときの既定座標（東京駅）。
 *
 * 位置情報を拒否されてもコア体験が止まらないようにするため。
 */
export const FALLBACK_LOCATION = { lat: 35.681236, lng: 139.767125 } as const;

/** Geolocation の待ち時間の上限。長く待たせるより既定座標で進める。 */
const GEOLOCATION_TIMEOUT_MS = 5000;

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * 現在地を取得する。取得できない場合は既定座標を返す。
 *
 * @returns 現在地、または `FALLBACK_LOCATION`
 */
export async function resolveCurrentLocation(): Promise<Coordinates> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return FALLBACK_LOCATION;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      () => resolve(FALLBACK_LOCATION),
      { timeout: GEOLOCATION_TIMEOUT_MS },
    );
  });
}
