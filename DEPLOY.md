# 🚀 GitHub Pages + Railway デプロイ手順

このガイドでは、今日のご飯アプリを**GitHub Pages**（フロントエンド）と**Railway**（バックエンド）にデプロイする方法を説明します。

## ✨ この構成の利点

- ✅ **完全無料**（両方とも無料プランで十分）
- ✅ **簡単**（コード変更最小限）
- ✅ **SQLiteそのまま使える**（データベース移行不要）
- ✅ **自動デプロイ**（GitHubにプッシュするだけ）

---

## 📋 前提条件

- GitHubアカウント
- Railwayアカウント（GitHubでサインアップ可能）
- Google Generative AI（Gemini）APIキー

---

## 🎯 ステップ1: GitHubリポジトリの準備

### 1-1. リポジトリを作成してプッシュ

```bash
# まだGitリポジトリを作成していない場合
git init
git add .
git commit -m "Initial commit"

# GitHubで新しいリポジトリを作成後（例: todays-meal）
git remote add origin https://github.com/YOUR_USERNAME/todays-meal.git
git branch -M main
git push -u origin main
```

---

## 🚂 ステップ2: Railwayでバックエンドをデプロイ

### 2-1. Railwayプロジェクトの作成

1. [Railway](https://railway.app/)にアクセス
2. 「Login with GitHub」でサインイン
3. 「New Project」をクリック
4. 「Deploy from GitHub repo」を選択
5. 作成したリポジトリ（例: `todays-meal`）を選択

### 2-2. 環境変数の設定

プロジェクト作成後、「Variables」タブで以下を設定：

| Variable | Value | 説明 |
|----------|-------|------|
| `GOOGLE_API_KEY` | あなたのGemini APIキー | [取得方法](https://aistudio.google.com/app/apikey) |
| `JWT_SECRET` | ランダムな文字列 | `openssl rand -base64 32`で生成 |
| `PORT` | `3001` | サーバーポート |
| `CLIENT_URL` | `https://YOUR_USERNAME.github.io` | 後で更新（最初は空でOK） |
| `NODE_ENV` | `production` | 本番環境 |

### 2-3. デプロイの確認

1. 「Deployments」タブでデプロイログを確認
2. `🍳 今日のご飯サーバーが起動しました`が表示されればOK
3. 「Settings」タブで「Generate Domain」をクリック
4. 生成されたURL（例: `https://todays-meal-production.up.railway.app`）をコピー

### 2-4. ボリューム（永続ストレージ）の追加

SQLiteデータベースを永続化するため：

1. プロジェクトページで「+ New」→「Volume」をクリック
2. 設定：
   - **Mount Path**: `/app/server/data`
3. 「Add」をクリック

---

## 📄 ステップ3: GitHub Pagesでフロントエンドをデプロイ

### 3-1. GitHub Secretsの設定

1. GitHubリポジトリページで「Settings」タブを開く
2. 左サイドバーで「Secrets and variables」→「Actions」をクリック
3. 「New repository secret」をクリック
4. 以下のSecretを追加：

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://YOUR-RAILWAY-URL.railway.app/api` |

**例**: `https://todays-meal-production.up.railway.app/api`

### 3-2. GitHub Pagesの有効化

1. リポジトリの「Settings」タブを開く
2. 左サイドバーで「Pages」をクリック
3. 「Source」で「GitHub Actions」を選択
4. 保存

### 3-3. 自動デプロイ

mainブランチにプッシュすると、自動的にデプロイされます：

```bash
git add .
git commit -m "Setup deployment"
git push
```

デプロイの進行状況は「Actions」タブで確認できます。

### 3-4. デプロイ完了の確認

1. 「Actions」タブでワークフローが完了するのを待つ（3-5分）
2. 「Settings」→「Pages」でURLを確認（例: `https://YOUR_USERNAME.github.io/todays-meal/`）
3. URLにアクセスしてアプリが表示されることを確認

---

## 🔄 ステップ4: RailwayのCORS設定を更新

フロントエンドのURLが確定したら、Railwayの環境変数を更新：

1. Railwayプロジェクトの「Variables」タブを開く
2. `CLIENT_URL`を更新：
   - **Value**: `https://YOUR_USERNAME.github.io`
3. サービスが自動的に再起動されます

---

## ✅ 動作確認

1. GitHub PagesのURLにアクセス
2. アカウントを作成してログイン
3. チャットでレシピをリクエスト
4. お気に入りやヒストリーが正常に動作することを確認

---

## 🔄 更新方法

コードを更新する場合：

```bash
git add .
git commit -m "Update message"
git push
```

- **バックエンド**: Railwayが自動的に再デプロイ
- **フロントエンド**: GitHub Actionsが自動的に再デプロイ

---

## 🐛 トラブルシューティング

### フロントエンドがデプロイされない

1. 「Actions」タブでエラーログを確認
2. `VITE_API_URL`シークレットが正しく設定されているか確認
3. GitHub Pagesが有効になっているか確認（Settings → Pages）

### バックエンドに接続できない

1. Railwayの「Deployments」タブでログを確認
2. 環境変数が正しく設定されているか確認
3. RailwayのURLが正しいか確認（`/api`を忘れずに）
4. `CLIENT_URL`がフロントエンドのURLと一致しているか確認

### CORSエラーが出る

1. Railwayの`CLIENT_URL`環境変数を確認
2. `https://YOUR_USERNAME.github.io`の形式で、末尾に`/`がないことを確認
3. 環境変数を変更後、デプロイが完了するまで待つ

### データベースがリセットされる

1. Volumeが正しくマウントされているか確認
2. Mount Pathが`/app/server/data`になっているか確認
3. Railwayの「Volumes」タブで確認

---

## 💡 無料プランの制限

### GitHub Pages
- 月間100GBの帯域幅
- 月間10GBのストレージ
- 1時間に10回のビルド

### Railway
- 月間$5分のクレジット（無料）
- 500時間/月の実行時間
- 500MBのメモリ
- 1GBのディスク

通常の個人使用では十分な範囲です！

---

## 🎨 カスタムドメインの設定（オプション）

### GitHub Pages
1. 「Settings」→「Pages」→「Custom domain」
2. ドメインを入力して保存
3. DNSレコードを設定（GitHubが指示）

### Railway
1. プロジェクトの「Settings」→「Networking」
2. 「Custom Domain」でドメインを追加
3. DNSレコードを設定

---

## 📚 参考リンク

- [GitHub Pages Documentation](https://docs.github.com/pages)
- [Railway Documentation](https://docs.railway.app/)
- [GitHub Actions Documentation](https://docs.github.com/actions)

---

## 🎉 完了！

これで、あなたの「今日のご飯」アプリが世界中からアクセスできるようになりました！

何か問題があれば、GitHubのIssuesで質問してください。

