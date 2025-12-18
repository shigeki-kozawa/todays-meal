# Google OAuth 設定ガイド

## 1. Google Cloud Console にアクセス

https://console.cloud.google.com/

## 2. プロジェクトを作成

1. 画面上部の「プロジェクトを選択」→「新しいプロジェクト」
2. プロジェクト名: `todays-meal`（任意）
3. 「作成」をクリック

## 3. OAuth 同意画面を設定

1. 左メニュー → **APIとサービス** → **OAuth 同意画面**
2. **外部** を選択 → 「作成」
3. 必須項目を入力：
   - アプリ名: `今日のご飯`
   - ユーザーサポートメール: あなたのGmail
   - デベロッパーの連絡先情報: あなたのGmail
4. 「保存して次へ」を3回クリック（スコープ、テストユーザーはスキップ）
5. 「ダッシュボードに戻る」

## 4. 認証情報を作成

1. 左メニュー → **APIとサービス** → **認証情報**
2. 「認証情報を作成」→ **OAuth クライアント ID**
3. アプリケーションの種類: **ウェブ アプリケーション**
4. 名前: `Web Client`（任意）
5. **承認済みの JavaScript 生成元** に以下を追加：
   ```
   http://localhost:5176
   http://localhost:5175
   http://localhost:5173
   ```
6. 「作成」をクリック

## 5. クライアントIDをコピー

表示されたダイアログから以下をコピー：
- **クライアントID**: `123456789.apps.googleusercontent.com` のような形式

## 6. 環境変数に設定

### `.env` ファイル（プロジェクトルート）

```bash
# 既存の内容はそのまま
GOOGLE_API_KEY=AIzaSyB1fAipCtgvWTcEH0QMXGE1ZfyQYQDU-GU

# この行を更新
GOOGLE_CLIENT_ID=あなたのクライアントID.apps.googleusercontent.com
```

### `client/.env` ファイル

```bash
VITE_GOOGLE_CLIENT_ID=あなたのクライアントID.apps.googleusercontent.com
```

## 7. サーバーを再起動

ターミナルで Ctrl+C でサーバーを停止し、再度起動：

```bash
npm run dev
```

## 8. 確認

ブラウザで http://localhost:5176/login にアクセスすると、「Googleでログイン」ボタンが表示されます！

---

## トラブルシューティング

### エラー: OAuth client was not found

- クライアントIDが正しくコピーされているか確認
- `.env` ファイルの形式が正しいか確認（余分なスペースがないか）
- サーバーを再起動したか確認

### ボタンが表示されない

- `client/.env` ファイルが存在するか確認
- `VITE_GOOGLE_CLIENT_ID` の値が `your_google_client_id_here` でないか確認
- ブラウザをリロード（Ctrl+Shift+R で強制リロード）

### その他

Google Cloud Consoleの「OAuth 同意画面」で公開ステータスが「テスト」の場合、
追加したGoogleアカウントでしかログインできません。
必要に応じて「公開」に変更してください。

