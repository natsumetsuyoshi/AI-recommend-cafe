/**
 * `POST /api/recommend` のクライアント。
 *
 * `useMoodRecommender` から見える API 呼び出しはこの関数1つだけ。
 * データ取得ライブラリ（RTK Query / TanStack Query など）を導入するときは、
 * このファイルが単一の差し替え点になる（検討は GitHub Issue #4）。
 *
 * 例外を投げず、成否を判別可能な結果型に畳んで返す。
 * 呼び出し側の分岐を try/catch ではなく型で書けるようにするため。
 */

import type { RecommendRequest, Recommendation } from "@/types";

/** 通信・API 呼び出しの結果。 */
export type RecommendResult =
  | { ok: true; recommendations: Recommendation[] }
  | { ok: false; message: string };

/** エラーレスポンスの形が想定と違うときに出す文言。 */
const FALLBACK_ERROR_MESSAGE =
  "おすすめを取得できませんでした。時間をおいて試してください。";

/** ネットワーク自体が失敗したときに出す文言。 */
const NETWORK_ERROR_MESSAGE =
  "通信に失敗しました。接続を確認して、もう一度試してください。";

/** エラーレスポンスから利用者向けメッセージを取り出す。 */
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    if (typeof payload?.error?.message === "string") {
      return payload.error.message;
    }
  } catch {
    // JSON でない応答（プロキシのエラーページ等）は既定文言にフォールバックする
  }

  return FALLBACK_ERROR_MESSAGE;
}

/**
 * おすすめを取得する。
 *
 * @param request - 気分・現在地・ローカル時刻
 * @returns 成功なら推薦一覧、失敗なら利用者向けメッセージ
 */
export async function requestRecommendations(
  request: RecommendRequest,
): Promise<RecommendResult> {
  try {
    const response = await fetch("/api/recommend", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      return { ok: false, message: await extractErrorMessage(response) };
    }

    const payload = await response.json();
    return { ok: true, recommendations: payload.recommendations ?? [] };
  } catch {
    return { ok: false, message: NETWORK_ERROR_MESSAGE };
  }
}
