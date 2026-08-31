import { describe, it, expect } from "vitest";

import { RateLimiter, resolveClientKey } from "@/lib/rate-limit";

const START = 1_000_000;

describe("RateLimiter", () => {
  it("上限までは許可する", () => {
    const limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });

    const results = [0, 1, 2].map((offset) =>
      limiter.consume("ip-a", START + offset),
    );

    expect(results.map((result) => result.isAllowed)).toEqual([true, true, true]);
  });

  it("残り回数を返す", () => {
    const limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });

    expect(limiter.consume("ip-a", START).remaining).toBe(2);
    expect(limiter.consume("ip-a", START + 1).remaining).toBe(1);
    expect(limiter.consume("ip-a", START + 2).remaining).toBe(0);
  });

  it("上限を超えると拒否する", () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 });
    limiter.consume("ip-a", START);
    limiter.consume("ip-a", START + 1);

    const result = limiter.consume("ip-a", START + 2);

    expect(result.isAllowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("拒否時に次に試せるまでの秒数を返す", () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 10_000 });
    limiter.consume("ip-a", START);

    const result = limiter.consume("ip-a", START + 1_000);

    // 最初の記録が START + 10_000 で外れるので、残り 9 秒
    expect(result.retryAfterSec).toBe(9);
  });

  it("ウィンドウを過ぎると回復する", () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1000 });
    limiter.consume("ip-a", START);
    expect(limiter.consume("ip-a", START + 500).isAllowed).toBe(false);

    const afterWindow = limiter.consume("ip-a", START + 1001);

    expect(afterWindow.isAllowed).toBe(true);
  });

  it("キーごとに独立して数える", () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1000 });
    limiter.consume("ip-a", START);

    expect(limiter.consume("ip-b", START).isAllowed).toBe(true);
    expect(limiter.consume("ip-a", START).isAllowed).toBe(false);
  });

  it("reset で記録を捨てる", () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1000 });
    limiter.consume("ip-a", START);

    limiter.reset();

    expect(limiter.consume("ip-a", START).isAllowed).toBe(true);
  });
});

describe("resolveClientKey", () => {
  it("x-vercel-forwarded-for があればそれを優先する", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "203.0.113.5",
      "x-forwarded-for": "203.0.113.1",
    });

    expect(resolveClientKey(headers)).toBe("203.0.113.5");
  });

  it("偽装された x-forwarded-for でキーを分散させられない", () => {
    // クライアントが x-forwarded-for を毎回変えても、Vercel が付ける
    // x-vercel-forwarded-for が同じなら同一クライアントとして数える
    const spoofed = ["10.0.0.1", "10.0.0.2", "10.0.0.3"].map((fake) =>
      resolveClientKey(
        new Headers({
          "x-vercel-forwarded-for": "203.0.113.5",
          "x-forwarded-for": fake,
        }),
      ),
    );

    expect(new Set(spoofed).size).toBe(1);
  });

  it("x-forwarded-for の先頭を使う", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.1, 198.51.100.7",
    });

    expect(resolveClientKey(headers)).toBe("203.0.113.1");
  });

  it("x-forwarded-for が無ければ x-real-ip を使う", () => {
    const headers = new Headers({ "x-real-ip": "203.0.113.9" });

    expect(resolveClientKey(headers)).toBe("203.0.113.9");
  });

  it("どちらも無ければ unknown にまとめる", () => {
    expect(resolveClientKey(new Headers())).toBe("unknown");
  });
});
