# AI-recommend-cafe

AIが気分にあったカフェを提案してくれる、カフェ特化の地図アプリ。

「今の気分」を入力すると、AIが気分に合ったカフェを地図上でおすすめしてくれます。
単なる店舗検索ではなく、**気分 → 体験の提案** を目指しています。

> 🚧 現在は MVP（動く最小プロダクト）の設計・開発段階です。

## ✨ 主な機能（MVP）

- 🗺️ 地図表示＋現在地取得
- ☕ 周辺カフェの表示（Google Places 連携）
- 💬 気分を入力 → AIがおすすめカフェを3件提案＋「なぜ合うか」の理由
- 📄 店舗詳細（写真・営業時間・評価・場所）
- ⭐ お気に入り保存

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
| AIレコメンド | Claude API |
| バックエンド | APIキー保護のための軽量サーバー（構成は検討中） |
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

## 🚀 セットアップ（予定）

> ⚠️ 実装はこれからです。以下は想定手順です。

```bash
# リポジトリを取得
git clone https://github.com/natsumetsuyoshi/AI-recommend-cafe.git
cd AI-recommend-cafe

# 依存パッケージをインストール
npm install

# 環境変数を設定（.env は git 管理外）
cp .env.example .env
# .env に各APIキーを記入

# 開発サーバーを起動
npm run dev
```

### 必要な環境変数（予定）

```
GOOGLE_MAPS_API_KEY=      # Google Maps / Places API
ANTHROPIC_API_KEY=        # Claude API
```

> 🔐 APIキーは `.env` に置き、**絶対にコミットしないでください**（`.gitignore` で除外済み）。
> 課金事故を防ぐため、キーはバックエンド経由で扱う方針です。

## 💰 コストについて

Google Maps/Places・Claude はいずれも従量課金です。
1回のレコメンド体験あたり **約10〜15円** が目安（モデル選択・表示件数で変動）。
詳細な試算は [`docs/requirements.md`](docs/requirements.md) を参照してください。

## 📚 ドキュメント

- [要件定義書（コスト試算含む）](docs/requirements.md)

## 📄 ライセンス

未定（検討中）。
