# AI-recommend-cafe

AIが気分にあったカフェを提案してくれる、カフェ特化の地図アプリ。

「今の気分」を入力すると、AIが気分に合ったカフェを地図上でおすすめしてくれます。
単なる店舗検索ではなく、**気分 → 体験の提案** を目指しています。

> 🚧 現在は MVP（動く最小プロダクト）の開発中です。
> 気分入力 → おすすめ3件表示までのコア体験が、**APIキーなしで通しで動きます**（データはフィクスチャ）。

## ✨ 主な機能（MVP）

| 機能 | 状態 |
|---|---|
| 💬 気分を入力 → おすすめカフェ3件＋「なぜ合うか」の理由 | ✅ 実装済み（フィクスチャ） |
| 📍 現在地取得（拒否時は東京駅にフォールバック） | ✅ 実装済み |
| 🛡️ 入力検証・レート制限・エラー表示 | ✅ 実装済み |
| ☕ 周辺カフェの取得（Google Places 実API） | ⏳ キー取得待ち |
| 🤖 AIレコメンド（Claude 実API） | ⏳ キー取得待ち |
| 🗺️ 地図表示（Google Maps） | ⏳ 未着手 |
| 📄 店舗詳細（写真・営業時間・評価・場所） | ⏳ 未着手 |
| ⭐ お気に入り保存 | ⏳ 未着手 |

現在 `lib/places.ts` / `lib/claude.ts` は固定のフィクスチャを返すだけの実装です。
**外部APIキーはまだ読んでおらず、設定しても挙動は変わりません**（外部通信も課金も発生しません）。
実API接続時は、呼び出し側（`lib/recommend.ts`）を変えずにこの2ファイルの中で
キーの有無を見て分岐させます。

### 将来的に追加したい機能

- 複数店舗をつなぐ「プラン」提案（例: 静かなカフェ → 散歩 → 本屋）
- ユーザー登録・口コミ投稿
- ルート案内、履歴からのパーソナライズ

## 🧱 技術構成

| 領域 | 使用技術 |
|---|---|
| フロントエンド | React |
| 地図 | Google Maps JavaScript API |
| カフェデータ | Google Places API（Nearby Search / Place Details） |
| AIレコメンド | Claude API（Sonnet 5） |
| バックエンド | Next.js Route Handlers（BFF） |
| テスト | Vitest ＋ React Testing Library |
| データ保存 | localStorage（お気に入り） |

## 🔄 コア体験フロー

```
気分を入力（自由文 or タグ選択）
  ↓
現在地・時間帯を取得
  ↓
周辺カフェを Google Places で取得
  ↓
AI（Claude）が「気分 × 店舗情報」でマッチング＆理由生成
  ↓
おすすめカフェ 3件を地図＆カードで表示（理由つき）
```

## 🚀 セットアップ

```bash
# リポジトリを取得
git clone https://github.com/natsumetsuyoshi/AI-recommend-cafe.git
cd AI-recommend-cafe

# 依存パッケージをインストール
npm ci

# 開発サーバーを起動
npm run dev
```

`http://localhost:3000` を開いて気分を入力すると、おすすめ3件が表示されます。
**APIキーは無くても動きます**（フィクスチャデータが使われます）。

### 環境変数

APIキーを使う場合のみ設定します。

```bash
cp .env.example .env
# .env に各APIキーを記入
```

| 変数 | 用途 | 露出 |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | 地図描画（⏳ 未使用・地図実装時に使用） | クライアント（要キー制限） |
| `GOOGLE_PLACES_API_KEY` | 周辺カフェ取得（⏳ 未使用・実API接続時に使用） | サーバーのみ |
| `ANTHROPIC_API_KEY` | AIレコメンド（⏳ 未使用・実API接続時に使用） | サーバーのみ |
| `CLAUDE_MODEL` | 使用モデル（既定 `claude-sonnet-5`） | サーバーのみ |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` | レート制限（既定 10回 / 10分） | サーバーのみ |

### 開発コマンド

```bash
npm run dev        # 開発サーバー
npm test           # テスト
npm run lint       # Lint
npm run typecheck  # 型チェック
npm run build      # 本番ビルド
```

## 🧩 ディレクトリ構成

Next.js の標準的な構成（`app/` はルーティング専用、実体はルート直下）です。
詳細は [`docs/architecture.md`](docs/architecture.md) の「3. アーキテクチャパターン」を参照。

```
app/                        ルーティングだけ
  layout.tsx
  page.tsx                  トップ（気分入力＋結果表示）
  api/recommend/route.ts    POST: 気分×周辺カフェ → おすすめ3件＋理由
components/                 表示
  MoodRecommender.tsx / MoodInput.tsx / CafeCard.tsx
hooks/
  useMoodRecommender.ts     画面の状態機械
lib/                        ロジック本体
  recommend.ts              おすすめ生成（HTTP を知らない）
  places.ts                 周辺カフェ取得（現在はフィクスチャ）
  claude.ts                 推薦生成（現在はフィクスチャ）
  prompt.ts                 Claude 向けプロンプト生成
  fixtures.ts               開発・テスト用カフェデータ
  validation.ts             入力検証
  rate-limit.ts             IP単位のレート制限
  errors.ts                 カスタムエラー（400 / 429 / 502）＋ HTTP 変換
  api-client.ts             ブラウザ → POST /api/recommend
  geolocation.ts            ブラウザ → 現在地取得
  constants.ts              クライアントとサーバーで共有する定数
types/
  index.ts                  共通型（Cafe / Recommendation ...）
__tests__/                  実装のディレクトリ構成に対応
```

サーバー専用のモジュールには `import "server-only"` を付けています。
クライアントコンポーネントから誤って import すると `npm run build` が落ちるので、
「これはサーバー側か」をビルドが教えてくれます。

> 🔐 APIキーは `.env` に置き、**絶対にコミットしないでください**（`.gitignore` で除外済み）。
> 課金事故を防ぐため、キーはバックエンド経由で扱う方針です。

## 💰 コストについて

Google Maps/Places・Claude はいずれも従量課金です。
1回のレコメンド体験あたり **約10〜15円** が目安（モデル選択・表示件数で変動）。
詳細な試算は [`docs/requirements.md`](docs/requirements.md) を参照してください。

## 📚 ドキュメント

- [要件定義書（コスト試算含む）](docs/requirements.md)
- [技術仕様書](docs/architecture.md)
- [作業計画・タスクリスト](.steering/)

## 📄 ライセンス

未定（検討中）。
