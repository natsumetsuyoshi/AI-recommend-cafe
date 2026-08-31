import "server-only";

/**
 * アプリ固有のエラーと、HTTP レスポンスへの変換。
 *
 * Route Handler は `toErrorResponse()` に例外を渡すだけでよい。
 * `status` と `code` は各エラークラスが持ち、
 * `{ error: { code, message } }` 形式へ一元的に変換される。
 * 想定外の例外は 500 にまとめ、内部詳細をクライアントへ返さない。
 */

import type { ErrorResponse } from "@/types";

/** HTTP ステータスとエラーコードを持つ基底エラー。 */
export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** 入力が不正なとき（400）。 */
export class ValidationError extends AppError {
  readonly status = 400;
  readonly code = "VALIDATION_ERROR";

  constructor(
    message: string,
    /** 問題のあったフィールド名 */
    public readonly field: string,
    /** 実際に渡された値（ログ用。クライアントには返さない） */
    public readonly value: unknown,
  ) {
    super(message);
  }
}

/** レート制限を超えたとき（429）。 */
export class RateLimitError extends AppError {
  readonly status = 429;
  readonly code = "RATE_LIMIT_EXCEEDED";

  constructor(
    message: string,
    /** 次に試せるまでの秒数 */
    public readonly retryAfterSec: number,
  ) {
    super(message);
  }
}

/** 外部API（Places / Claude）の呼び出しに失敗したとき（502）。 */
export class ExternalApiError extends AppError {
  readonly status = 502;
  readonly code = "EXTERNAL_API_ERROR";

  constructor(
    message: string,
    /** 元の例外。サーバーログにのみ出す */
    public readonly reason?: unknown,
  ) {
    super(message);
  }
}

/** 例外が `AppError` かどうかを判定する。 */
function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** `{ error: { code, message } }` 形式のエラーレスポンスを作る。 */
export function errorResponse(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
): Response {
  const body: ErrorResponse = { error: { code, message } };
  return Response.json(body, { status, headers });
}

/**
 * 例外を統一形式の HTTP レスポンスへ変換する。
 *
 * @param error - 捕捉した例外
 * @param logPrefix - サーバーログに付ける識別子（エンドポイント名など）
 */
export function toErrorResponse(error: unknown, logPrefix: string): Response {
  if (isAppError(error)) {
    const headers =
      error instanceof RateLimitError
        ? { "Retry-After": String(error.retryAfterSec) }
        : undefined;

    // 外部APIの失敗は原因をサーバー側にだけ残す
    if (error instanceof ExternalApiError) {
      console.error(`${logPrefix} 外部API呼び出しに失敗:`, error.reason);
    }

    // 不正入力の調査用。渡された値はここにだけ出し、クライアントへは返さない
    if (error instanceof ValidationError) {
      console.warn(
        `${logPrefix} 入力が不正: field=${error.field} value=`,
        error.value,
      );
    }

    return errorResponse(error.status, error.code, error.message, headers);
  }

  // 想定外の例外。詳細はクライアントに返さない
  console.error(`${logPrefix} 想定外のエラー:`, error);
  return errorResponse(
    500,
    "INTERNAL_ERROR",
    "サーバー側で問題が発生しました。時間をおいて試してください。",
  );
}
