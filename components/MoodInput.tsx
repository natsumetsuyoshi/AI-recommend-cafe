"use client";

import { useState } from "react";

import { MOOD_MAX_LENGTH } from "@/lib/constants";

interface MoodInputProps {
  /** 気分が送信されたときに呼ばれる。空文字では呼ばれない */
  onSubmit: (mood: string) => void;
  /** 送信中かどうか。true の間は入力と送信を止める */
  isSubmitting: boolean;
}

/** 気分をひとことで入れるための候補。入力の取っかかりとして置く。 */
const MOOD_SUGGESTIONS = [
  "静かに集中したい",
  "なんかモヤモヤする",
  "おしゃれな雰囲気で話したい",
  "ひとりでぼんやりしたい",
] as const;

/** 「今の気分」を自由文で受け取るフォーム。 */
export function MoodInput({ onSubmit, isSubmitting }: MoodInputProps) {
  const [mood, setMood] = useState("");

  const trimmedMood = mood.trim();
  const canSubmit = trimmedMood.length > 0 && !isSubmitting;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onSubmit(trimmedMood);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="mood" className="text-sm font-medium">
        いまの気分は？
      </label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="mood"
          name="mood"
          type="text"
          value={mood}
          maxLength={MOOD_MAX_LENGTH}
          disabled={isSubmitting}
          onChange={(event) => setMood(event.target.value)}
          placeholder="例: 静かに集中したい"
          className="flex-1 rounded-lg border border-black/15 bg-white px-4 py-3 text-base outline-none placeholder:text-zinc-400 focus:border-amber-600 disabled:opacity-60 dark:border-white/20 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-amber-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "探しています…" : "カフェを探す"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {MOOD_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={isSubmitting}
            onClick={() => setMood(suggestion)}
            className="rounded-full border border-black/10 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-amber-600 hover:text-amber-700 disabled:opacity-50 dark:border-white/15 dark:text-zinc-400"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </form>
  );
}
