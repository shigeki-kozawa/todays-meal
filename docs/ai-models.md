# AIモデルの使い分け

## 概要

「今日のご飯」アプリでは、用途に応じて2つの異なるGeminiモデルを使い分けています。

---

## モデル構成

### 1. 会話モデル（gemini-2.5-flash）

**用途**: 基本的な会話・食材の理解・応答生成

**特徴**:
- ⚡ 高速レスポンス
- 💰 コスト効率が良い
- 🗣️ 自然な会話に最適
- 🆕 最新のGemini 2.5シリーズ

**使用箇所**:
- 初回の挨拶生成
- ユーザー入力の分析（食材抽出）
- AIの応答テキスト生成
- 会話の文脈理解

---

### 2. レシピモデル（gemini-3-pro-preview）

**用途**: レシピの生成

**特徴**:
- 🎯 最高精度な生成
- 🧠 複雑な推論が可能
- 📊 詳細な栄養情報の計算
- 🆕 最新のGemini 3シリーズ（プレビュー版）

**使用箇所**:
- レシピの詳細生成
- 材料リストの作成
- 調理手順の生成
- カロリー・栄養素の計算

---

## ワークフロー

```
ユーザー入力
    ↓
[会話モデル] 入力分析・食材抽出
    ↓
食材が揃っている？
    ↓ Yes
[レシピモデル] 詳細レシピ生成
    ↓
[会話モデル] ユーザーへの応答生成
    ↓
表示
```

---

## コスト最適化

| モデル | 料金（1M tokens） | 用途 | 使用頻度 |
|--------|-------------------|------|----------|
| gemini-2.5-flash | 安価 | 会話 | 高 |
| gemini-3-pro-preview | 高価 | レシピ | 低 |

会話は頻繁に発生しますが軽量なタスクなので高速で安価なモデルを使用。
レシピ生成は発生頻度が低いですが高品質が求められるため高性能モデルを使用。

---

## パフォーマンス

| 処理 | モデル | 平均レスポンス時間 |
|------|--------|-------------------|
| 挨拶生成 | flash | ~0.5秒 |
| 入力分析 | flash | ~0.3秒 |
| レシピ生成 | pro | ~2-3秒 |
| 応答生成 | flash | ~0.5秒 |

---

## モデル変更方法

`server/src/agent/index.ts` の以下の部分を変更：

```typescript
// 会話モデル
conversationModel = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',  // または gemini-2.5-flash-lite
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.7,
});

// レシピモデル
recipeModel = new ChatGoogleGenerativeAI({
  model: 'gemini-3-pro-preview',  // ← Gemini 3 Pro（プレビュー版）
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.7,
});
```

---

## 利用可能なモデル（2024年12月時点）

### 会話向け（高速・低コスト）
- `gemini-2.5-flash` ✅ 推奨
- `gemini-2.5-flash-lite` ✅ より軽量
- `gemini-2.0-flash`
- `gemini-2.0-flash-exp`

### レシピ生成向け（高精度）
- `gemini-3-pro-preview` ✅ 最新・最高精度
- `gemini-2.5-pro`

詳細: https://ai.google.dev/gemini-api/docs/models/gemini

