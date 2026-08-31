import "server-only";

/**
 * `POST /api/recommend` のリクエストボディ検証。
 *
 * 外部から届く値は信用できないため、`unknown` から型を絞り込む形で書き、
 * 不正な入力は `ValidationError` として弾く。
 *
 * 文字数の上限はブラウザ側の入力制限と共有するため `lib/constants.ts` にある。
 */

import { MOOD_MAX_LENGTH } from "@/lib/constants";
import { ValidationError } from "@/lib/errors";
import type { RecommendRequest } from "@/types";

const LAT_MIN = -90;
const LAT_MAX = 90;
const LNG_MIN = -180;
const LNG_MAX = 180;
const HOUR_MIN = 0;
const HOUR_MAX = 23;

/** 制御文字とみなすコードポイントの境界（C0 制御文字と DEL）。 */
const C0_CONTROL_MAX = 31;
const DELETE_CODE_POINT = 127;

function isControlCharacter(char: string): boolean {
  const codePoint = char.codePointAt(0) ?? 0;
  return codePoint <= C0_CONTROL_MAX || codePoint === DELETE_CODE_POINT;
}

/**
 * 制御文字を半角スペースに置き換える。
 *
 * 改行を含む制御文字はプロンプトの構造を壊し、指示部分との境界を偽装するのに使えるため、
 * 長さを判定する前に取り除く。
 */
function stripControlCharacters(value: string): string {
  return Array.from(value)
    .map((char) => (isControlCharacter(char) ? " " : char))
    .join("");
}

function requireNumberInRange(
  value: unknown,
  field: string,
  min: number,
  max: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError(`${field} は数値で指定してください。`, field, value);
  }

  if (value < min || value > max) {
    throw new ValidationError(
      `${field} は ${min} 〜 ${max} の範囲で指定してください。指定値: ${value}`,
      field,
      value,
    );
  }

  return value;
}

/**
 * リクエストボディを検証し、`RecommendRequest` に変換する。
 *
 * @param body - `request.json()` の結果（型を信用できないので `unknown`）
 * @returns 検証済みのリクエスト
 * @throws {ValidationError} いずれかのフィールドが不正な場合
 *
 * @example
 * ```typescript
 * const parsed = parseRecommendRequest({
 *   mood: "静かに集中したい",
 *   lat: 35.681,
 *   lng: 139.767,
 *   localHour: 14,
 * });
 * ```
 */
export function parseRecommendRequest(body: unknown): RecommendRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ValidationError(
      "リクエストボディは JSON オブジェクトで送信してください。",
      "body",
      body,
    );
  }

  const record = body as Record<string, unknown>;

  if (typeof record.mood !== "string") {
    throw new ValidationError("mood は文字列で指定してください。", "mood", record.mood);
  }

  const mood = stripControlCharacters(record.mood).trim();

  if (mood.length === 0) {
    throw new ValidationError("気分を入力してください。", "mood", record.mood);
  }

  if (mood.length > MOOD_MAX_LENGTH) {
    throw new ValidationError(
      `気分は ${MOOD_MAX_LENGTH} 文字以内で入力してください。現在の文字数: ${mood.length}`,
      "mood",
      record.mood,
    );
  }

  const lat = requireNumberInRange(record.lat, "lat", LAT_MIN, LAT_MAX);
  const lng = requireNumberInRange(record.lng, "lng", LNG_MIN, LNG_MAX);
  const localHour = requireNumberInRange(
    record.localHour,
    "localHour",
    HOUR_MIN,
    HOUR_MAX,
  );

  if (!Number.isInteger(localHour)) {
    throw new ValidationError(
      `localHour は整数で指定してください。指定値: ${localHour}`,
      "localHour",
      record.localHour,
    );
  }

  return { mood, lat, lng, localHour };
}
