/**
 * `/api/recommend` 向けの簡易レート制限。
 *
 * クライアントの識別に IP を使う HTTP 境界（controller）の関心。
 * ユースケース層には持ち込まない。
 *
 * 外部API（Places / Claude）は従量課金のため、1つのクライアントが呼び出しを
 * 連打しただけで課金が膨らむ。それを防ぐのが目的。
 *
 * MVP ではプロセス内の Map で保持する。インスタンスをまたいだ制限は保証しないが、
 * `docs/architecture.md` の方針どおり、まずは暴発の抑止を優先する。
 */

import "server-only";

/** 既定の上限回数。 */
export const DEFAULT_MAX_REQUESTS = 10;

/** 既定のウィンドウ幅（ミリ秒）= 10分。 */
export const DEFAULT_WINDOW_MS = 600_000;

export interface RateLimitOptions {
  /** ウィンドウ内で許可する最大リクエスト数 */
  maxRequests?: number;
  /** ウィンドウ幅（ミリ秒） */
  windowMs?: number;
}

export interface RateLimitResult {
  /** 今回のリクエストを許可してよいか */
  isAllowed: boolean;
  /** ウィンドウ内で残り何回呼べるか */
  remaining: number;
  /** 拒否時に、次に試せるまでの秒数（許可時は 0） */
  retryAfterSec: number;
}

/**
 * スライディングウィンドウ方式のレート制限。
 *
 * キー（通常はIPアドレス）ごとに、直近ウィンドウ内のリクエスト時刻を保持する。
 * 時刻を引数で受け取れるようにしており、テストから経過時間を制御できる。
 */
export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly hits = new Map<string, number[]>();

  constructor(options: RateLimitOptions = {}) {
    this.maxRequests = options.maxRequests ?? DEFAULT_MAX_REQUESTS;
    this.windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  }

  /**
   * 1回分の消費を試みる。
   *
   * @param key - クライアントを識別するキー（IPアドレスなど）
   * @param now - 現在時刻（ミリ秒）。テストから注入できるようにしている
   * @returns 許可判定と残り回数
   *
   * @example
   * ```typescript
   * const limiter = new RateLimiter({ maxRequests: 10, windowMs: 600_000 });
   * const result = limiter.consume("203.0.113.1");
   * if (!result.isAllowed) {
   *   throw new RateLimitError("...", result.retryAfterSec);
   * }
   * ```
   */
  consume(key: string, now: number = Date.now()): RateLimitResult {
    const windowStart = now - this.windowMs;
    const recentHits = (this.hits.get(key) ?? []).filter(
      (timestamp) => timestamp > windowStart,
    );

    if (recentHits.length >= this.maxRequests) {
      this.hits.set(key, recentHits);

      // 最も古い記録がウィンドウから外れれば1回分空く
      const oldestHit = recentHits[0];
      const retryAfterMs = oldestHit + this.windowMs - now;

      return {
        isAllowed: false,
        remaining: 0,
        retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      };
    }

    recentHits.push(now);
    this.hits.set(key, recentHits);
    this.pruneExpiredKeys(windowStart);

    return {
      isAllowed: true,
      remaining: this.maxRequests - recentHits.length,
      retryAfterSec: 0,
    };
  }

  /** テスト用に、記録をすべて捨てる。 */
  reset(): void {
    this.hits.clear();
  }

  /**
   * ウィンドウから外れたキーを捨てる。
   *
   * 掃除しないと、一度きりのアクセスをしたIPの分だけ Map が伸び続ける。
   */
  private pruneExpiredKeys(windowStart: number): void {
    for (const [key, timestamps] of this.hits) {
      const lastHit = timestamps[timestamps.length - 1];
      if (lastHit === undefined || lastHit <= windowStart) {
        this.hits.delete(key);
      }
    }
  }
}

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * `/api/recommend` が共有するレートリミッタ。
 *
 * Route Handler はリクエストごとに再評価されるため、モジュールスコープで保持して
 * プロセス内で状態を共有する。
 */
const recommendRateLimiter = new RateLimiter({
  maxRequests: readPositiveIntEnv("RATE_LIMIT_MAX", DEFAULT_MAX_REQUESTS),
  windowMs: readPositiveIntEnv("RATE_LIMIT_WINDOW_MS", DEFAULT_WINDOW_MS),
});

/**
 * リクエストヘッダーからクライアントIPを取り出す。
 *
 * `x-forwarded-for` は原則クライアントが自由に付けられるヘッダで、プロキシが
 * 追記する構成ではその先頭は攻撃者が指定した値になる。毎回でたらめな値を
 * 送るだけで上限を回避できてしまうため、まずプラットフォームが必ず自分で
 * 付け替える `x-vercel-forwarded-for` を見る（デプロイ先は Vercel に決定済み。
 * `docs/architecture.md`）。
 *
 * `x-forwarded-for` / `x-real-ip` はローカルや Vercel 以外で動かしたときの
 * 保険として残す。偽装しうる値なので、あくまで best-effort の識別子として扱う。
 * どれも取れない場合は共通キーにまとめ、少なくとも全体としての上限は効くようにする。
 */
export function resolveClientKey(headers: Headers): string {
  // Vercel が付与する信頼できるクライアントIP。クライアントからは上書きできない
  const vercelForwardedFor = headers.get("x-vercel-forwarded-for")?.trim();
  if (vercelForwardedFor) {
    return vercelForwardedFor;
  }

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [clientIp] = forwardedFor.split(",");
    const trimmed = clientIp?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * リクエストヘッダーからクライアントを特定し、1回分を消費する。
 *
 * Route Handler からはこの関数だけを使えばよい。
 *
 * @param headers - 受信リクエストのヘッダー
 * @returns 許可判定と、拒否時の待機秒数
 */
export function consumeRateLimit(headers: Headers): RateLimitResult {
  return recommendRateLimiter.consume(resolveClientKey(headers));
}

/** テスト用に、共有リミッタの記録を捨てる。 */
export function resetRateLimits(): void {
  recommendRateLimiter.reset();
}
