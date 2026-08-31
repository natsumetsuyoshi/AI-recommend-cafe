/**
 * アプリ全体で共有する型。
 *
 * クライアント（components / hooks）とサーバー（app/api, lib）の両方から使う。
 * `server-only` は付けない。
 */

/** 価格帯。Google Places の priceLevel（0〜4）に対応する。 */
export type PriceLevel = 0 | 1 | 2 | 3 | 4;

/**
 * カフェ1件。
 *
 * Google Places のレスポンスから組み立てられる粒度にしており、
 * 実API接続時にこの型を変えずに済むようにしている。
 * Places では欠損しうるフィールドは `null` を明示する。
 */
export interface Cafe {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** 平均評価（1.0〜5.0）。未評価の店では null */
  rating: number | null;
  /** 評価件数。未評価の店では null */
  userRatingCount: number | null;
  priceLevel: PriceLevel | null;
  /** 営業中かどうか。Places が営業時間を持たない店では null */
  isOpenNow: boolean | null;
  address: string;
  /** レビュー本文の抜粋。雰囲気の推測に使うため上位数件のみ保持する */
  reviewExcerpts: string[];
}

/** おすすめカフェ1件と、その理由。 */
export interface Recommendation {
  cafe: Cafe;
  /** 「なぜあなたの気分に合うか」を1〜2文で述べた文章 */
  reason: string;
}

/** `POST /api/recommend` のリクエストボディ（検証済み）。 */
export interface RecommendRequest {
  mood: string;
  lat: number;
  lng: number;
  /** 利用者の端末のローカル時刻（0〜23）。時間帯に応じた提案に使う */
  localHour: number;
}

/** `POST /api/recommend` の成功レスポンス。 */
export interface RecommendResponse {
  recommendations: Recommendation[];
}

/** エラーレスポンスの統一形式。 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/** 周辺カフェ検索のパラメータ（`lib/places.ts`）。 */
export interface NearbySearchParams {
  lat: number;
  lng: number;
  /** 検索半径（メートル） */
  radiusMeters: number;
  /** 取得件数の上限 */
  limit: number;
}

/** 推薦生成の入力（`lib/claude.ts` / `lib/prompt.ts`）。 */
export interface RecommendInput {
  mood: string;
  localHour: number;
  cafes: Cafe[];
  /** 返す推薦の件数 */
  limit: number;
}
