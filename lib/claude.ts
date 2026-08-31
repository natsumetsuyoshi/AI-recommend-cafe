import "server-only";

/**
 * 気分に合うカフェの選定と理由生成（Data Access Layer）。
 *
 * Anthropic API キーを読むのはこのファイルだけ。
 * キーが未設定のあいだは決定的なロジックで理由を組み立てるので、
 * 外部通信も課金も発生しないままコア体験を通しで動かせる。
 *
 * 実API接続時は、この関数の中で `process.env.ANTHROPIC_API_KEY` を見て
 * 分岐を足す。呼び出し側（`lib/recommend.ts`）は変更不要。
 */

import { buildRecommendPrompt } from "@/lib/prompt";
import type { Cafe, RecommendInput, Recommendation } from "@/types";

/**
 * 使用する Claude モデル。
 *
 * MVP は Sonnet 5（`docs/architecture.md` の決定）。
 * 検証結果しだいで Haiku 4.5 / Opus 4.8 へ切り替えられるよう環境変数で差し替え可能にする。
 */
export const DEFAULT_CLAUDE_MODEL = "claude-sonnet-5";

/** 環境変数を見て、使用するモデルIDを決める。 */
export function resolveClaudeModel(): string {
  return process.env.CLAUDE_MODEL?.trim() || DEFAULT_CLAUDE_MODEL;
}

/** 評価の降順で比較する。評価が無い店は後ろに回す。 */
function byRatingDesc(a: Cafe, b: Cafe): number {
  return (b.rating ?? 0) - (a.rating ?? 0);
}

/** 価格帯を人が読める表記にする。 */
function describePriceLevel(priceLevel: number | null): string {
  if (priceLevel === null) {
    return "価格帯は不明ですが";
  }
  return priceLevel <= 1 ? "手ごろな価格帯で" : "落ち着いた価格帯で";
}

/**
 * 決定的なロジックで理由文を組み立てる。
 *
 * 実API接続後は Claude の生成文に置き換わる。ここでの目的は、
 * UI が「気分と店の情報を踏まえた文章」を受け取れることの確認。
 */
function buildReason(cafe: Cafe, input: RecommendInput): string {
  const excerpt = cafe.reviewExcerpts[0];
  const openness = cafe.isOpenNow === false ? "いまは営業時間外ですが、" : "";
  const price = describePriceLevel(cafe.priceLevel);

  const excerptPart = excerpt
    ? `「${excerpt}」という声があります。`
    : "レビューは少なめですが、落ち着いた雰囲気の店です。";

  return `${openness}「${input.mood}」という気分なら${cafe.name}が合いそうです。${price}、${excerptPart}`;
}

/**
 * 気分に合うカフェを選び、理由を付けて返す。
 *
 * 実装差し替え時にプロンプト側のバグが残らないよう、返す内容には使わないが
 * `buildRecommendPrompt` を実際に通している。
 *
 * @param input - 気分・時間帯・候補カフェ・希望件数
 * @returns 評価の高い順に最大 `limit` 件の推薦
 */
export async function generateRecommendations(
  input: RecommendInput,
): Promise<Recommendation[]> {
  // 実API実装と同じ入力でプロンプトを組めることを、ここでも担保しておく
  buildRecommendPrompt(input);

  return [...input.cafes]
    .sort(byRatingDesc)
    .slice(0, input.limit)
    .map((cafe) => ({ cafe, reason: buildReason(cafe, input) }));
}
