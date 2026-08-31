/**
 * `POST /api/recommend`
 *
 * 気分と現在地を受け取り、おすすめカフェを理由つきで返す。
 * この Route Handler が持つのは HTTP の関心だけ
 * （レート制限・入力検証・レスポンス化・エラー変換）。
 * おすすめを作るロジックは `lib/recommend.ts` にある。
 *
 * Google Places / Claude の API キーはこの層より先に出さない。
 * Next.js 16 では Route Handler は既定でキャッシュされず、POST は元よりキャッシュ対象外。
 */

import { RateLimitError, errorResponse, toErrorResponse } from "@/lib/errors";
import { consumeRateLimit } from "@/lib/rate-limit";
import { recommendCafes } from "@/lib/recommend";
import { parseRecommendRequest } from "@/lib/validation";
import type { RecommendResponse } from "@/types";

/** サーバーログの識別子。 */
const LOG_PREFIX = "[recommend]";

export async function POST(request: Request): Promise<Response> {
  try {
    const rateLimit = consumeRateLimit(request.headers);

    if (!rateLimit.isAllowed) {
      throw new RateLimitError(
        `リクエストが多すぎます。${rateLimit.retryAfterSec} 秒ほど待ってから試してください。`,
        rateLimit.retryAfterSec,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(
        400,
        "VALIDATION_ERROR",
        "リクエストボディを JSON として読み取れませんでした。",
      );
    }

    const recommendations = await recommendCafes(parseRecommendRequest(body));

    const payload: RecommendResponse = { recommendations };
    return Response.json(payload);
  } catch (error) {
    return toErrorResponse(error, LOG_PREFIX);
  }
}
