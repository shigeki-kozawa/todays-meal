# 環境変数設定ガイド

## 📋 必要な環境変数

### **サーバー側（Railway / Backend）**

```env
# Google API Keys
GOOGLE_API_KEY=AIzaSyB1fAipCtgvWTcEH0QMXGE1ZfyQYQDU-GU
GOOGLE_CLIENT_ID=483263681047-emk166088gnd6vtiocjsg1l9mh0sp1ug.apps.googleusercontent.com

# JWT Secret（本番環境では必ず変更！）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Database
DATABASE_URL=/data/todays-meal.db

# Server
PORT=3001
NODE_ENV=production

# AI Models（オプション）
CONVERSATION_MODEL=gemini-2.5-flash
RECIPE_MODEL=gemini-2.5-flash

# CORS（デプロイ後にVercelのURLに変更）
CLIENT_URL=https://your-app.vercel.app
```

---

### **クライアント側（Vercel / Frontend）**

```env
# API Endpoint（デプロイ後にRailwayのURLに変更）
VITE_API_URL=https://todays-meal-production.up.railway.app

# Google OAuth
VITE_GOOGLE_CLIENT_ID=483263681047-emk166088gnd6vtiocjsg1l9mh0sp1ug.apps.googleusercontent.com
```

---

## 🔐 セキュリティ注意事項

### ⚠️ JWT_SECRET について
- **絶対に** デフォルト値を本番環境で使用しないでください
- ランダムな文字列を生成することを推奨

```bash
# ランダムなJWT_SECRETを生成（Mac/Linux）
openssl rand -base64 64

# または
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

### ⚠️ API Keys について
- `.env` ファイルは **絶対に** Gitにコミットしない
- `.gitignore` に `.env` が含まれていることを確認

---

## 🌍 環境別の設定

### **開発環境（ローカル）**

`.env` ファイルをプロジェクトルートに作成：

```env
GOOGLE_API_KEY=AIzaSyB1fAipCtgvWTcEH0QMXGE1ZfyQYQDU-GU
GOOGLE_CLIENT_ID=483263681047-emk166088gnd6vtiocjsg1l9mh0sp1ug.apps.googleusercontent.com
JWT_SECRET=dev-secret-key-only-for-local
DATABASE_URL=./data/todays-meal.db
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

クライアント側（`client/.env.local`）:

```env
VITE_API_URL=http://localhost:3001
VITE_GOOGLE_CLIENT_ID=483263681047-emk166088gnd6vtiocjsg1l9mh0sp1ug.apps.googleusercontent.com
```

---

### **本番環境（Vercel + Railway）**

#### Railway（サーバー）

Railway の環境変数設定画面で以下を追加：

```
GOOGLE_API_KEY=AIzaSyB1fAipCtgvWTcEH0QMXGE1ZfyQYQDU-GU
GOOGLE_CLIENT_ID=483263681047-emk166088gnd6vtiocjsg1l9mh0sp1ug.apps.googleusercontent.com
JWT_SECRET=（ランダムに生成した64文字以上の文字列）
DATABASE_URL=/data/todays-meal.db
PORT=3001
NODE_ENV=production
CLIENT_URL=https://todays-meal.vercel.app
```

#### Vercel（クライアント）

Vercel の環境変数設定画面で以下を追加：

```
VITE_API_URL=https://todays-meal-production.up.railway.app
VITE_GOOGLE_CLIENT_ID=483263681047-emk166088gnd6vtiocjsg1l9mh0sp1ug.apps.googleusercontent.com
```

---

## ✅ 確認チェックリスト

デプロイ前に以下を確認：

- [ ] `.env` ファイルが `.gitignore` に含まれている
- [ ] 本番環境の `JWT_SECRET` をランダムな値に変更
- [ ] `CLIENT_URL` を本番環境のURLに変更
- [ ] `VITE_API_URL` を本番環境のURLに変更
- [ ] Google OAuth のリダイレクトURIに本番URLを追加
- [ ] API キーが正しく設定されている

---

## 🔄 環境変数の更新方法

### Railway
1. ダッシュボードで該当プロジェクトを開く
2. 「Variables」タブをクリック
3. 変更したい変数を編集
4. 自動的に再デプロイされる

### Vercel
1. ダッシュボードで該当プロジェクトを開く
2. 「Settings」→「Environment Variables」
3. 変更したい変数を編集
4. 再デプロイが必要（「Deployments」→「Redeploy」）

---

## 🐛 トラブルシューティング

### 「環境変数が読み込まれない」

**原因**: 
- ファイル名が間違っている（`.env` ではなく `env.txt` など）
- ファイルの場所が間違っている

**解決策**:
```bash
# 確認
ls -la | grep env

# 正しい場所に配置されているか確認
# サーバー: /todays-meal/.env
# クライアント: /todays-meal/client/.env.local
```

### 「CORS エラーが出る」

**原因**: 
- `CLIENT_URL` が間違っている
- サーバー側のCORS設定が間違っている

**解決策**:
1. Railway の `CLIENT_URL` を確認
2. `server/src/index.ts` の CORS 設定を確認
3. ブラウザのコンソールでエラー詳細を確認

### 「Google OAuth が動作しない」

**原因**: 
- リダイレクトURIが登録されていない
- クライアントIDが間違っている

**解決策**:
1. Google Cloud Console でリダイレクトURIを確認
2. `VITE_GOOGLE_CLIENT_ID` が正しいか確認
3. ブラウザキャッシュをクリア

---

## 📚 参考リンク

- [Vercel 環境変数ドキュメント](https://vercel.com/docs/concepts/projects/environment-variables)
- [Railway 環境変数ドキュメント](https://docs.railway.app/develop/variables)
- [Vite 環境変数ドキュメント](https://vitejs.dev/guide/env-and-mode.html)

