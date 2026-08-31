import type { Recommendation } from "@/types";

interface CafeCardProps {
  recommendation: Recommendation;
  /** 一覧での順位（1始まり）。地図のピンと対応づけるために表示する */
  rank: number;
}

/** 価格帯を記号で表す。不明なら何も出さない。 */
function formatPriceLevel(priceLevel: number | null): string | null {
  if (priceLevel === null) {
    return null;
  }
  return "¥".repeat(Math.max(1, priceLevel));
}

/** 評価と件数をまとめた表示にする。未評価なら null。 */
function formatRating(
  rating: number | null,
  userRatingCount: number | null,
): string | null {
  if (rating === null) {
    return null;
  }

  const count = userRatingCount === null ? "" : `（${userRatingCount}件）`;
  return `★ ${rating.toFixed(1)}${count}`;
}

/** おすすめカフェ1件を、理由つきで表示するカード。 */
export function CafeCard({ recommendation, rank }: CafeCardProps) {
  const { cafe, reason } = recommendation;
  const rating = formatRating(cafe.rating, cafe.userRatingCount);
  const price = formatPriceLevel(cafe.priceLevel);

  return (
    <article className="rounded-xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/15 dark:bg-zinc-900">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-600 text-sm font-semibold text-white"
        >
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold tracking-tight">{cafe.name}</h3>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            {rating && <span>{rating}</span>}
            {price && <span>{price}</span>}
            {cafe.isOpenNow !== null && (
              <span
                className={
                  cafe.isOpenNow
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-zinc-500"
                }
              >
                {cafe.isOpenNow ? "営業中" : "営業時間外"}
              </span>
            )}
          </div>

          <p className="mt-3 text-sm leading-6 text-zinc-800 dark:text-zinc-200">
            {reason}
          </p>

          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">{cafe.address}</p>
        </div>
      </div>
    </article>
  );
}
