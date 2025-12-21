# デプロイガイド

## 📋 目次
1. [デプロイ先の選択](#デプロイ先の選択)
2. [推奨: Vercel + Railway](#推奨-vercel--railway)
3. [代替案1: Netlify + Railway](#代替案1-netlify--railway)
4. [代替案2: 完全クラウド（GCP/AWS）](#代替案2-完全クラウドgcpaws)

---

## 🎯 デプロイ先の選択

### **推奨構成: Vercel（フロントエンド） + Railway（バックエンド）**

| 項目 | Vercel | Railway |
|------|--------|---------|
| **用途** | React フロントエンド | Node.js API サーバー |
| **無料枠** | 月100GB転送 | $5クレジット/月 |
| **特徴** | 自動デプロイ、CDN | PostgreSQL/SQLite対応 |
| **難易度** | ⭐☆☆☆☆ | ⭐⭐☆☆☆ |

**メリット**:
- ✅ 無料枠が充実
- ✅ 自動デプロイ（Gitプッシュで即反映）
- ✅ HTTPSが自動で有効化
- ✅ セットアップが簡単

**デメリット**:
- ⚠️ Railwayは無料枠が限定的（月$5クレジット）
- ⚠️ 2つのサービスを管理する必要がある

---

## 🚀 推奨: Vercel + Railway

### **Step 1: GitHubリポジトリにプッシュ**

```bash
cd /Users/kozawa.shigeki/Documents/work/todays-meal

# Gitリポジトリの初期化（まだの場合）
git init
git add .
git commit -m "feat: 音声機能と逆引き機能を追加"

# GitHubにプッシュ
# （GitHubで新しいリポジトリを作成してから実行）
git remote add origin https://github.com/YOUR_USERNAME/todays-meal.git
git branch -M main
git push -u origin main
```

---

### **Step 2: Railway でバックエンドをデプロイ**

#### 1. Railway アカウント作成
1. https://railway.app/ にアクセス
2. 「Start a New Project」をクリック
3. GitHubでサインイン

#### 2. プロジェクト作成
1. 「Deploy from GitHub repo」を選択
2. `todays-meal` リポジトリを選択
3. 「Add variables」で環境変数を設定

#### 3. 環境変数の設定

```env
# Railway の環境変数設定画面で以下を追加
GOOGLE_API_KEY=AIzaSyB1fAipCtgvWTcEH0QMXGE1ZfyQYQDU-GU
GOOGLE_CLIENT_ID=483263681047-emk166088gnd6vtiocjsg1l9mh0sp1ug.apps.googleusercontent.com
JWT_SECRET=your-super-secret-jwt-key-change-this
DATABASE_URL=/data/todays-meal.db
PORT=3001
NODE_ENV=production

# CORS設定（後でVercelのURLに変更）
CLIENT_URL=https://your-app.vercel.app
```

#### 4. ビルド設定

Railway で以下を設定：

```
Root Directory: server
Build Command: npm install
Start Command: npm start
```

#### 5. サーバー起動スクリプトを追加

`server/package.json` に以下を追加：

```json
{
  "scripts": {
    "start": "node dist/index.js",
    "build": "tsc",
    "dev": "tsx watch src/index.ts"
  }
}
```

#### 6. TypeScriptビルド設定

`server/tsconfig.json` を確認：

```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    ...
  }
}
```

#### 7. デプロイ実行

1. Railway が自動でビルド＆デプロイ
2. デプロイ完了後、URLをコピー（例：`https://todays-meal-production.up.railway.app`）

---

### **Step 3: Vercel でフロントエンドをデプロイ**

#### 1. Vercel アカウント作成
1. https://vercel.com/ にアクセス
2. 「Start Deploying」をクリック
3. GitHubでサインイン

#### 2. プロジェクトインポート
1. 「Add New Project」をクリック
2. `todays-meal` リポジトリを選択
3. 「Import」をクリック

#### 3. ビルド設定

```
Framework Preset: Vite
Root Directory: client
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

#### 4. 環境変数の設定

```env
VITE_API_URL=https://todays-meal-production.up.railway.app
VITE_GOOGLE_CLIENT_ID=483263681047-emk166088gnd6vtiocjsg1l9mh0sp1ug.apps.googleusercontent.com
```

#### 5. デプロイ実行

1. 「Deploy」をクリック
2. デプロイ完了後、URLをコピー（例：`https://todays-meal.vercel.app`）

---

### **Step 4: CORS設定を更新**

#### Railway の環境変数を更新

```env
CLIENT_URL=https://todays-meal.vercel.app
```

#### サーバーコードを確認

`server/src/index.ts` で CORS が正しく設定されているか確認：

```typescript
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
```

---

### **Step 5: Google OAuth リダイレクトURI を更新**

1. Google Cloud Console にアクセス
2. OAuth 2.0 クライアント ID の設定を開く
3. 「承認済みのリダイレクト URI」に以下を追加：
   ```
   https://todays-meal.vercel.app
   ```

---

### **Step 6: データベースの永続化（オプション）**

Railwayで永続化ストレージを追加：

1. Railway ダッシュボードで「Volumes」タブを開く
2. 「New Volume」をクリック
3. Mount Path: `/data`
4. サイズ: 1GB（無料枠）

---

## 🔄 自動デプロイの設定

### Vercel
- `main` ブランチにプッシュで自動デプロイ
- プレビューデプロイも自動

### Railway
- `main` ブランチにプッシュで自動デプロイ
- 環境変数の変更も自動反映

---

## 💰 コスト見積もり

### 無料枠の範囲内（月間使用量が少ない場合）

| サービス | 無料枠 | 推定コスト |
|----------|--------|-----------|
| **Vercel** | 100GB転送/月 | $0 |
| **Railway** | $5クレジット/月 | $0〜$5 |
| **合計** | - | **$0〜$5/月** |

### 使用量が増えた場合（月1000ユーザー想定）

| サービス | 推定コスト |
|----------|-----------|
| **Vercel** | $0〜$20/月 |
| **Railway** | $10〜$20/月 |
| **合計** | **$10〜$40/月** |

---

## 🛡️ セキュリティチェックリスト

- [ ] `.env` ファイルを `.gitignore` に追加済み
- [ ] JWT_SECRET を本番環境用に変更
- [ ] Google OAuth リダイレクトURIを本番URLに変更
- [ ] API キーを環境変数で管理
- [ ] CORS設定を本番URLに限定

---

## 📱 PWA対応（オプション）

現在のコードにはすでにPWA対応が含まれています：
- `manifest.json`: アプリのメタデータ
- `sw.js`: Service Worker（オフライン対応）

デプロイ後、スマホで以下を確認：
1. ブラウザで開く
2. 「ホーム画面に追加」が表示される
3. アプリとしてインストール可能

---

## 🐛 トラブルシューティング

### Railway でビルドエラー

```bash
# ローカルでビルドテスト
cd server
npm run build
npm start
```

### Vercel でビルドエラー

```bash
# ローカルでビルドテスト
cd client
npm run build
npm run preview
```

### CORS エラー

- Railway の `CLIENT_URL` を確認
- サーバー側の CORS 設定を確認
- ブラウザのコンソールでエラー詳細を確認

---

## 🎉 デプロイ完了後の確認

1. ✅ フロントエンドにアクセスできる
2. ✅ Google ログインが動作する
3. ✅ チャット機能が動作する
4. ✅ 音声入力が動作する（HTTPSが必須）
5. ✅ 音声読み上げが動作する
6. ✅ レシピの保存/お気に入りが動作する

---

## 📊 監視・ログ

### Vercel
- ダッシュボードでアクセスログ確認
- エラーログ自動収集

### Railway
- ダッシュボードでサーバーログ確認
- メトリクス（CPU、メモリ使用量）表示

---

## 🔄 更新デプロイ

コードを更新したら：

```bash
git add .
git commit -m "feat: 新機能を追加"
git push
```

→ Vercel と Railway が自動でデプロイ！

---

## 📞 サポート

問題が発生したら：
1. Railway/Vercel のログを確認
2. ブラウザのコンソールを確認
3. 環境変数が正しく設定されているか確認

