# 🍳 今日のご飯 - AIレシピアシスタント

AIがあなたの「今日何食べよう？」を解決するチャットアプリケーションです。

## 機能

- 🤖 **AIチャット**: 食材や気分を伝えるとレシピを提案
- 🥗 **レシピ生成**: 調理時間、カロリー、栄養素付きのレシピ
- ❤️ **お気に入り**: 気に入ったレシピを保存
- 📜 **履歴**: 過去の会話を振り返り
- ⏱️ **フィルタリング**: 調理時間でレシピを絞り込み
- 📊 **ソート**: カロリーや時間でソート可能

## 技術スタック

### フロントエンド
- React 18 + TypeScript
- Vite
- TailwindCSS
- React Router
- Lucide Icons

### バックエンド
- Node.js + Express
- LangChain.js + LangGraph.js
- Google Gemini API
- SQLite (better-sqlite3)
- JWT認証

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成:

```bash
# Google Gemini API
GOOGLE_API_KEY=your_gemini_api_key_here

# LangSmith (Optional)
LANGCHAIN_TRACING_V2=false
LANGCHAIN_API_KEY=
LANGCHAIN_PROJECT=todays-meal

# Server
PORT=3001
NODE_ENV=development

# JWT Secret
JWT_SECRET=your_secret_key_here

# Database
DATABASE_URL=./data/todays-meal.db
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

- フロントエンド: http://localhost:5173
- バックエンド: http://localhost:3001

## プロジェクト構造

```
todays-meal/
├── client/                 # フロントエンド
│   ├── src/
│   │   ├── components/     # UIコンポーネント
│   │   ├── contexts/       # React Context
│   │   ├── lib/            # API クライアント
│   │   ├── pages/          # ページコンポーネント
│   │   └── types/          # TypeScript型定義
│   └── ...
├── server/                 # バックエンド
│   ├── src/
│   │   ├── agent/          # LangGraph エージェント
│   │   ├── db/             # データベース
│   │   ├── middleware/     # Express ミドルウェア
│   │   ├── routes/         # APIルート
│   │   └── types/          # TypeScript型定義
│   └── ...
├── docs/                   # ドキュメント
└── ...
```

## API エンドポイント

| メソッド | パス | 説明 |
|----------|------|------|
| POST | /api/auth/register | ユーザー登録 |
| POST | /api/auth/login | ログイン |
| GET | /api/auth/me | 現在のユーザー取得 |
| POST | /api/chat/start | 新規チャット開始 |
| POST | /api/chat | メッセージ送信 |
| GET | /api/chat/conversations | 会話一覧 |
| GET | /api/favorites | お気に入り一覧 |
| POST | /api/favorites | お気に入り追加 |
| DELETE | /api/favorites/:id | お気に入り削除 |
| GET | /api/history | 履歴一覧 |

## 参考ドキュメント

- [Google OAuth セットアップガイド](./docs/google-oauth-setup.md)
- [AI Models 設定](./docs/ai-models.md)
- [要件定義](./docs/requirements.md)

## ライセンス

MIT

