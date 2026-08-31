# 技術仕様書 (Architecture Design Document) — AI-recommend-cafe

最終更新: 2026-08-30

本書は `docs/requirements.md`（要件定義／PRD相当）を技術的に実現するための、システム構造と技術選定を定義する。
機能ごとの画面・振る舞いは別途「機能設計書（`docs/functional-design.md`）」で定義する（本書の対象外）。

> 🚩 印は「推奨として記載しているが、着手前に確認・確定したい決定事項」。

---

## 1. システム全体像

気分入力を起点に、Next.js アプリが**サーバー側（BFF）で外部APIを束ね**、AIが気分に合うカフェを提案する。
APIキー保護とコスト制御のため、Google Places / Claude へのアクセスは**すべてサーバー経由**にする。

```
┌──────────────────────────── ブラウザ（クライアント） ────────────────────────────┐
│  Next.js (React) UI                                                              │
│   ├─ 地図表示 (Google Maps JavaScript API を直接ロード ※キーはクライアント露出)    │
│   ├─ 気分入力 / レコメンド結果カード / 店舗詳細                                     │
│   └─ お気に入り (localStorage)                                                     │
└───────────────┬──────────────────────────────────────────────────────────────┘
                │ fetch (/api/*)
                ▼
┌──────────────────────────── Next.js サーバー（Route Handlers = BFF） ───────────┐
│  /api/recommend   気分×周辺カフェ → Claude でマッチング＆理由生成                   │
│  /api/cafes       周辺カフェ取得 (Places Nearby Search) ＋キャッシュ                │
│  /api/cafes/[id]  店舗詳細 (Places Place Details)                                  │
│   └─ サーバー内キャッシュ（Places結果の短時間キャッシュでコスト削減）               │
└───────────────┬───────────────────────────────┬──────────────────────────────┘
                │ (server-side, キー秘匿)          │ (server-side, キー秘匿)
                ▼                                 ▼
        Google Places API                    Claude API (Anthropic)
   (Nearby Search / Place Details)         (気分×店舗のマッチング・理由生成)
```

**キー露出の整理（重要）**
- **Google Maps JavaScript API キー**: 地図をブラウザで描画するため**クライアントに露出せざるを得ない**。→ Google側の**キー制限（HTTPリファラー制限＋API制限）**で守る。
- **Google Places API キー / Claude API キー**: **サーバー側のみ**。ブラウザには一切出さない（`.env` → Route Handlers 内で使用）。

---

## 2. テクノロジースタック

### 言語・ランタイム

| 技術 | バージョン |
|------|-----------|
| Node.js | 20.x（CIと統一） |
| TypeScript | 5.x |
| npm | 10.x |

### フレームワーク・ライブラリ

| 技術 | バージョン | 用途 | 選定理由 |
|------|-----------|------|----------|
| Next.js (App Router) | 16.x | フロント＋BFF（Route Handlers） | フロントとサーバーを1つに統合でき、APIキー保護をサーバー側で完結できる |
| React | 19.x | UI | Next.js標準 |
| Tailwind CSS | 4.x | スタイリング | 素早くUIを組める |
| Google Maps JavaScript API | - | 地図描画・ピン表示 | 地図UIの標準。Places/Mapと統合しやすい |
| `@anthropic-ai/sdk` | 最新 | Claude API 呼び出し | 公式SDK。サーバー側で使用 |

地図描画には **`@vis.gl/react-google-maps`**（Google公式のReactラッパー）を採用する（2026-08-30 決定）。生の Maps JS API を自前で包むより実装コストが低い。

### 開発ツール

| 技術 | バージョン | 用途 | 選定理由 |
|------|-----------|------|----------|
| Vitest | 4.x | ユニットテスト | ESM/Next相性が良く高速 |
| React Testing Library | 16.x | コンポーネントテスト | Reactの標準的テスト手法 |
| ESLint (eslint-config-next) | 9.x | Lint | Next標準 |
| GitHub Actions | - | CI（Lint/型/テスト/ビルド） | `docs`外の標準構成に準拠 |

---

## 3. アーキテクチャパターン

### レイヤー構成

Next.js の標準的な構成（公式ドキュメントの「Store project files outside of `app`」）を採る。
`app/` はルーティング専用にし、実体はルート直下のフォルダに置く。

```
app/          ← Next.js が所有。ルーティングだけ
components/   ← 表示
hooks/        ← 画面ロジック（状態機械・副作用の呼び出し）
lib/          ← ロジック本体（サーバー側＋ブラウザ側ヘルパ）
types/        ← クライアントとサーバーで共有する型
```

データの流れ:

```
components → hooks → lib/api-client → POST /api/recommend
                                            ↓
                                    app/api/recommend/route.ts
                                       （HTTP の関心だけ）
                                            ↓
                                       lib/recommend.ts
                                       （HTTP を知らない）
                                        ↙            ↘
                              lib/places.ts      lib/claude.ts
                              （APIキーを読むのはこの2つだけ）
```

- **`app/`**: ルーティングのみ。`layout.tsx` / `page.tsx` / `api/*/route.ts`。
  Route Handler が持つのは HTTP の関心だけ（レート制限・入力検証・レスポンス化・エラー変換）。
  API キーはこの層より先に出さない。
- **`components/`**: 表示。`fetch` も `navigator` も持たない。
- **`hooks/`**: 画面の状態機械。JSX を持たないので DOM 非依存でテストできる。
- **`lib/`**: ロジック本体。フラットに置く。
  - サーバー側: `recommend.ts`（オーケストレーション）/ `places.ts` `claude.ts`（外部サービス。
    公式ガイドで言う **Data Access Layer**）/ `prompt.ts` / `fixtures.ts` / `validation.ts` /
    `rate-limit.ts` / `errors.ts`
  - ブラウザ側: `api-client.ts` / `geolocation.ts`
  - 両方: `constants.ts`
- **`types/`**: 共有型。

#### サーバー/クライアント境界

フォルダ名では境界を強制できないため、サーバー専用モジュールに `import "server-only"` を付ける
（公式ドキュメントが Data Access Layer の例で示している方法）。
クライアントコンポーネントから誤って import すると `npm run build` が落ちる。

| ファイル | `server-only` |
|---|---|
| `lib/recommend.ts` `places.ts` `claude.ts` `prompt.ts` `fixtures.ts` `rate-limit.ts` `errors.ts` `validation.ts` | ✅ |
| `lib/api-client.ts` `lib/geolocation.ts` `lib/constants.ts` `types/index.ts` | ❌（両方から使う） |

API キーを読むのは `lib/places.ts` と `lib/claude.ts` のみ
（公式ガイドの「`process.env` を読むのは Data Access Layer だけ」に合わせる）。

#### 採らない設計

エンドポイント1本・画面1つの規模に対して過剰なので、以下は採用しない。

- ポート interface と DI コンテナ（実装の切り替えは `lib/places.ts` `lib/claude.ts` の
  中で環境変数を見て分岐させる。テストは `vi.mock` で差し替える）
- controller / usecase / repository というレイヤー命名（Next.js の慣習ではなく、
  参照できる前例が無くなるため。責務の線は同じ場所に引いたうえで、Next.js の語彙で表現する）
- DTO の詰め替え層（HTTP レスポンスとドメインモデルが一致しているため）

### ディレクトリ構成

```
app/
  layout.tsx
  page.tsx
  globals.css
  api/
    recommend/route.ts    POST: 気分×周辺カフェ → おすすめ3件＋理由
components/
  MoodRecommender.tsx     画面全体
  MoodInput.tsx           気分の入力フォーム
  CafeCard.tsx            おすすめ1件の表示
hooks/
  useMoodRecommender.ts   画面の状態機械
lib/
  recommend.ts            おすすめ生成（HTTP を知らない）
  places.ts               周辺カフェ取得（現在はフィクスチャ）
  claude.ts               推薦生成（現在はフィクスチャ）
  prompt.ts               Claude 向けプロンプト生成
  fixtures.ts             開発・テスト用カフェデータ
  validation.ts           入力検証
  rate-limit.ts           IP単位のレート制限
  errors.ts               カスタムエラー（400 / 429 / 502）＋ HTTP 変換
  api-client.ts           ブラウザ → POST /api/recommend
  geolocation.ts          ブラウザ → 現在地取得
  constants.ts            クライアントとサーバーで共有する定数
types/
  index.ts                共通型（Cafe, Recommendation ...）
```

---

## 4. 主要データフロー（レコメンド）

```
1. ユーザーが気分を入力（自由文 or タグ）              [UI]
2. 現在地(geolocation)・時間帯を取得                   [UI]
3. POST /api/recommend { mood, lat, lng, time }        [UI→BFF]
4. Nearby Search で周辺カフェ取得（キャッシュ確認）      [BFF→Places]
5. 各カフェの評価・レビュー抜粋を要約し、Claudeへ        [BFF→Claude]
   「気分×店舗情報」でマッチング＋理由生成を依頼
6. おすすめ3件＋理由を返却                              [BFF→UI]
7. 地図にピン＋カード表示。詳細は /api/cafes/[id] 経由   [UI]
```

---

## 5. 外部API連携方針

| API | 呼び出し場所 | キー | 保護方法 |
|-----|------------|------|---------|
| Google Maps JavaScript API | クライアント | クライアント露出 | HTTPリファラー制限＋API制限（Maps JSのみ許可） |
| Google Places API | サーバー(BFF) | サーバーのみ | `.env` → Route Handlers 内で使用。ブラウザに出さない |
| Claude API | サーバー(BFF) | サーバーのみ | 同上。SDKはサーバーでのみ import |

- Claude モデル: **Claude Sonnet 5**（`claude-sonnet-5`）に決定（2026-08-30）。品質とコストのバランスによる。モデルIDは環境変数 `CLAUDE_MODEL` で差し替え可能にし、検証結果しだいで Haiku 4.5／Opus 4.8 へ切り替えられるようにする。
- Claude 呼び出しは**プロンプトキャッシュ**（固定の指示部分）を使い入力トークンを削減。レビューは上位数件の抜粋のみ渡す。

---

## 6. データ永続化戦略

| データ種別 | ストレージ | フォーマット | 理由 |
|-----------|----------|-------------|------|
| お気に入り | ブラウザ localStorage | JSON | MVPではログイン無し。端末ローカルで十分 |
| 周辺カフェ検索結果 | サーバー側キャッシュ | メモリ（短TTL） | Places呼び出し回数＝コスト。同一エリアの再取得を抑制 |

- 🚩 キャッシュ実装: MVPは**インメモリ（インスタンス単位・TTL数分）**で開始。将来スケール時に **Vercel KV / Redis** へ移行。
- Places のキャッシュは**利用規約のキャッシュ制限**に留意（長期保存は不可。短時間の再利用に限定）。
- バックアップ戦略: MVPでは永続DBを持たないため対象外。将来DB導入時に検討。

---

## 7. パフォーマンス・コスト最適化

### レスポンスタイム目標（目安）

| 操作 | 目標 | 備考 |
|------|------|------|
| 周辺カフェ表示 | ~1.5秒 | Nearby Search＋地図描画 |
| レコメンド生成 | ~3〜6秒 | Claude 呼び出し込み。ローディングUIで体感を補う |

### コスト最適化（要件定義のコスト試算と連動）

- **Place Details のフィールド最小化**（最もコストに効く）
- **Places 結果の短時間キャッシュ**
- **Claude はモデル選択＋レビュー入力の絞り込み＋プロンプトキャッシュ**
- 1回のレコメンド体験あたり ~10〜15円 が目安（`docs/requirements.md` 参照）

---

## 8. セキュリティアーキテクチャ

### 機密情報管理
- APIキーは `.env`（git管理外）に置き、**サーバー側 Route Handlers 内でのみ使用**。
- Google Maps JS キーは露出前提のため、**Google Cloud 側でキー制限**（リファラー・API種別）を必須設定。

### 入力検証
- `/api/*` は受け取る `mood`（文字列長制限）・座標（数値・範囲）をサーバーでバリデーション。
- Claude へ渡すユーザー入力はプロンプトインジェクション対策として、指示と明確に分離（ユーザー入力はデータとして扱う）。

### レート制限・濫用対策
- `/api/recommend` に簡易レート制限（IP単位）を **MVP から入れる**（2026-08-30 決定）。外部API課金の暴発を防ぐため。MVP はプロセス内メモリのスライディングウィンドウ（既定 10回 / 10分）で開始し、スケール時にキャッシュ層と同様の移行先を検討する。

---

## 9. テスト戦略

### ユニットテスト
- **フレームワーク**: Vitest ＋ React Testing Library
- **外部API**: モックして実際の課金を発生させない
- **テストの置き場所は実装のディレクトリ構成に対応させる**:

| 対象 | 場所 | 検証すること |
|---|---|---|
| `app/api/*/route.ts` | `__tests__/api/` | ステータス・レスポンス形式・ヘッダ・情報漏れ |
| `lib/recommend.ts` | `__tests__/lib/` | 定数の受け渡し・例外の変換（`lib/places` / `lib/claude` を `vi.mock`） |
| `lib/*`（その他） | `__tests__/lib/` | 各モジュールの単体挙動 |
| `hooks/*` | `__tests__/hooks/` | 状態遷移（`renderHook`。DOM を使わない） |
| `components/*` | `__tests__/components/` | 状態ごとの表示（hook をモック） |

> `server-only` を import しているモジュールは、テスト環境では
> `vitest.config.ts` の alias でパッケージ付属の空実装に差し替えている。

### 統合テスト
- `__tests__/components/*.integration.test.tsx`: components → hook → api-client → fetch の
  配線が繋がっていることを代表経路で確認する（各層の詳細はユニットテストが見る）

### E2E
- 🚩 MVPでは任意。将来 Playwright 等で「気分入力→レコメンド表示」を検証

### CI
- GitHub Actions で Lint → 型 → テスト → ビルド（既存 `ci.yml`）

---

## 10. デプロイ・スケーラビリティ

- **デプロイ先: Vercel に決定**（Next.js 標準・Route Handlers がそのまま動く）。
- 環境変数（`GOOGLE_MAPS_API_KEY` / `GOOGLE_PLACES_API_KEY` / `ANTHROPIC_API_KEY` / `CLAUDE_MODEL`）はデプロイ先の環境変数に設定。
- スケール時: インメモリキャッシュ → Vercel KV/Redis、必要に応じ CDN・エッジ活用。

---

## 11. 技術的制約・依存関係

### 環境要件
- Node.js 20 以上（Next.js 16 の要件）
- 対応ブラウザ: モダンブラウザ（Geolocation API 必須）

### 制約
- Google Maps JS キーはクライアント露出が避けられない → キー制限で担保
- Places のデータはキャッシュ期間に規約上の制限あり
- Claude / Places は従量課金 → 呼び出し回数の制御が前提

### 依存関係管理

| ライブラリ | 用途 | バージョン管理方針 |
|-----------|------|-------------------|
| next / react | 基盤 | 範囲指定（メジャー固定） |
| @anthropic-ai/sdk | Claude連携 | 最新に追従 |
| vitest / testing-library | テスト | 範囲指定 |

---

## 12. 決定事項・未決事項（🚩の一覧）

### 確定済み（2026-08-30）

- [x] 地図実装に `@vis.gl/react-google-maps` を使う → **採用**
- [x] Claude モデルの確定 → **Sonnet 5**（`CLAUDE_MODEL` で差し替え可能）
- [x] `/api/recommend` のレート制限を MVP で入れるか → **入れる**（IP単位・インメモリ・既定10回/10分）
- [x] デプロイ先 → **Vercel に決定**

### 確定済み（2026-08-31）

- [x] ディレクトリ構成 → **Next.js 標準**（`app/` はルーティング専用、実体は
  `components/` `hooks/` `lib/` `types/`）。
  当初 controller / usecase / repository の3層を採ったが、これは NestJS 由来で
  Next.js の慣習ではなく、参照できる前例が無くなるため取りやめた。
  責務の線は同じ場所に引いたうえで、Next.js の語彙で表現している（詳細は「3. アーキテクチャパターン」）。
- [x] サーバー/クライアント境界の強制 → **`server-only` パッケージを使う**。
  フォルダ名では境界を強制できない。導入時に実際の違反を1件検出した
  （`MoodInput` → `lib/validation.ts` → `lib/errors.ts`）。
- [x] 外部サービスの差し替え方式 → **ポート interface と DI コンテナを持たない**。
  実装の切り替えは `lib/places.ts` / `lib/claude.ts` の中で環境変数を見て分岐させ、
  テストは `vi.mock` で差し替える。interface 2つとファクトリ1ファイルを削除しても、
  テスト容易性も差し替え可能性も失われなかった。
- [x] API キーを読む場所 → **`lib/places.ts` と `lib/claude.ts` のみ**
  （Next.js 公式の Data Access Layer ガイドの方針に合わせる）。

### 未決

- [ ] Places キャッシュの実装方式（MVP案: インメモリ短TTL）— 実API接続時に確定する
- [ ] E2E テストを MVP に含めるか
- [ ] **外部API呼び出しのタイムアウト・リトライ方針** — 実API接続時に、
  `AbortSignal` を `lib/recommend.ts` から渡すか、`lib/places.ts` / `lib/claude.ts` が
  自前で持つかを先に決める。現在のシグネチャには時間制御が入っていない。
- [ ] **レート制限の複数インスタンス対応** — 現在はプロセス内 Map のため、
  Vercel のような複数インスタンス環境では実効上限がインスタンス数倍になる。
  デプロイ時にこの前提を再確認し、必要なら Vercel KV / Redis へ移す。

### 別タスクに切り出したもの

- GitHub Issue #4 — サーバー状態管理ライブラリ（RTK Query / TanStack Query / SWR / 現状維持）の検討
- GitHub Issue #5 — フィクスチャまわりの読みやすさ改善（`FixtureCafe` の型 / プロンプト予行の意図）
