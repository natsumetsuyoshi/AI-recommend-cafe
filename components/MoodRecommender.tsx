"use client";

import { CafeCard } from "@/components/CafeCard";
import { MoodInput } from "@/components/MoodInput";
import { useMoodRecommender } from "@/hooks/useMoodRecommender";

/** 気分入力からレコメンド表示までの画面。状態は `useMoodRecommender` が持つ。 */
export function MoodRecommender() {
  const { recommendations, errorMessage, isSubmitting, submit } = useMoodRecommender();
  const hasResult = !isSubmitting && recommendations !== null;

  return (
    <div className="flex w-full flex-col gap-8">
      <MoodInput onSubmit={submit} isSubmitting={isSubmitting} />

      {errorMessage && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {errorMessage}
        </p>
      )}

      {isSubmitting && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          気分に合うカフェを探しています…
        </p>
      )}

      {hasResult && recommendations.length === 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          近くに条件に合うカフェが見つかりませんでした。別の気分で試してみてください。
        </p>
      )}

      {hasResult && recommendations.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold">あなたにおすすめの3軒</h2>
          <ul className="flex flex-col gap-4">
            {recommendations.map((recommendation, index) => (
              <li key={recommendation.cafe.id}>
                <CafeCard recommendation={recommendation} rank={index + 1} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
