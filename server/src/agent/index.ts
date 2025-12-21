import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { StateGraph, Annotation, END, START } from '@langchain/langgraph';
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from '@langchain/core/messages';
import { Recipe, Ingredient, SideDish } from '../types/index.js';
import { getUserPreferences, extractPreferencesFromMessage, formatPreferencesForPrompt } from '../utils/preferences.js';
import { searchRecipeKnowledgeBase, formatRecipesForPrompt, extractTagsFromMessage } from '../utils/rag.js';

const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  userInput: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => '',
  }),
  userId: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => '',
  }),
  ingredients: Annotation<string[]>({
    reducer: (current, update) => {
      const merged = [...current, ...update]
      return [...new Set(merged)]
    },
    default: () => [],
  }),
  recipes: Annotation<Recipe[]>({
    reducer: (_current, update) => update,
    default: () => [],
  }),
  isValidInput: Annotation<boolean>({
    reducer: (_current, update) => update,
    default: () => false,
  }),
  maxCookingTime: Annotation<number | null>({
    reducer: (_current, update) => update,
    default: () => null,
  }),
});

type GraphStateType = typeof GraphState.State;

let conversationModel: ChatGoogleGenerativeAI | null = null;
let recipeModel: ChatGoogleGenerativeAI | null = null;

function getConversationModel(): ChatGoogleGenerativeAI {
  if (!conversationModel) {
    const modelName = process.env.CONVERSATION_MODEL || 'gemini-2.5-flash';
    conversationModel = new ChatGoogleGenerativeAI({
      model: modelName,
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0.7,
    });
    console.log(`🤖 会話モデル初期化: ${modelName}`);
  }
  return conversationModel;
}

function getRecipeModel(): ChatGoogleGenerativeAI {
  if (!recipeModel) {
    const modelName = process.env.RECIPE_MODEL || 'gemini-2.5-flash';
    recipeModel = new ChatGoogleGenerativeAI({
      model: modelName,
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0.7,
    });
    console.log(`🍳 レシピモデル初期化: ${modelName}`);
  }
  return recipeModel;
}

const systemPrompt = `あなたは「今日のご飯アシスタント」です。ユーザーが今日何を食べるか決める手助けをします。

役割:
1. ユーザーに今日の食事について質問して会話を開始
2. ユーザーが食材を教えてくれたら、その食材を使ったレシピを提案
3. ユーザーが気分や好みを伝えてくれたら、それに合ったレシピを提案
4. レシピには調理時間、カロリー、栄養素の概算を含める
5. 複数のレシピを提案する際は、必ず異なる料理を提案すること

重要な会話の文脈理解ルール:
- 会話履歴から、ユーザーが教えてくれた食材を全て記憶すること
- 新しい食材が追加された場合、以前の食材と合わせて考慮すること
- 提示された食材は「使える食材」であり、全てを使う必要はない。適切な組み合わせで美味しい料理を作ること
- ユーザーが「他に何か作れる？」と聞いた場合、これまで教えてもらった食材を使った別のレシピを提案
- 食材リストは会話の最初から累積的に増えていく

レシピ提案のルール:
- 必ず異なる料理を提案すること（同じ料理名や似た料理は避ける）
- 料理のバリエーションを豊かにすること（調理法、味付け、食材の組み合わせを変える）
- 「簡単」「時短」「手軽」などの指示がある場合は、20分以内で作れるレシピを優先
- ユーザーの嗜好や過去の履歴を考慮すること

応答ルール:
- 自然で丁寧な日本語を使う
- 親しみやすい口調だが、過度にカジュアルすぎない
- 絵文字は控えめに使用（1メッセージに1〜2個程度）
- 日本の家庭料理を中心に提案
- 簡単に作れるレシピを優先
- 「はい、かしこまりました」のような硬い表現は避ける
- 「〜だよ」「〜してね」のような過度なフレンドリーさも避ける
- 「〜ですね」「〜いかがですか？」のような自然な敬語を使う`;

async function analyzeInput(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const userInput = state.userInput;
  const existingIngredients = state.ingredients || [];

  const analysisPrompt = `
ユーザーの入力を分析してください。

現在までにユーザーが教えてくれた食材: ${existingIngredients.length > 0 ? existingIngredients.join(', ') : 'なし'}
新しい入力: "${userInput}"

以下のJSON形式で回答してください:
{
  "isValidInput": true/false (食材や料理に関する入力かどうか),
  "ingredients": ["食材1", "食材2"] (今回の入力から新たに抽出された食材のリスト、なければ空配列),
  "requestType": "ingredients" | "mood" | "specific_dish" | "substitute" | "other",
  "specificDish": "料理名" (ユーザーが特定の料理を希望している場合のみ),
  "missingIngredient": "材料名" (代替品を求めている場合の材料名)
}

重要: 
- 既存の食材は含めず、今回の入力から新たに追加される食材のみを返してください
- 「他に何か作れる？」のような質問の場合、ingredientsは空配列にしてください
- 「麻婆豆腐が食べたい」「カレーを作りたい」など、特定の料理名が含まれる場合は、requestTypeを"specific_dish"にし、specificDishに料理名を入れてください
- 「〇〇がない」「〇〇の代わり」「代用できるもの」などの表現がある場合は、requestTypeを"substitute"にし、missingIngredientにその材料名を入れてください

JSONのみを返してください。`;

  const response = await getConversationModel().invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(analysisPrompt),
  ]);

  try {
    const content = response.content as string;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        isValidInput: parsed.isValidInput,
        ingredients: parsed.ingredients || [],
      };
    }
  } catch {
    console.error('Failed to parse analysis response');
  }

  return {
    isValidInput: true,
    ingredients: [],
  };
}

async function generateRecipes(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const { ingredients, userInput, maxCookingTime } = state;
  const allIngredients = [...new Set(ingredients)];

  let recipePrompt = `
ユーザーの要望に基づいてレシピを3つ提案してください。

ユーザーの最新の入力: "${userInput}"
${allIngredients.length > 0 ? `これまでに教えてもらった全ての食材: ${allIngredients.join(', ')}` : ''}
${maxCookingTime ? `調理時間制限: ${maxCookingTime}分以内` : ''}

重要: ${allIngredients.length > 0 ? `可能な限り「${allIngredients.join(', ')}」の全てまたは複数を使ったレシピを提案してください。` : ''}

調理手順は必ず5〜8ステップの詳細な手順で記載してください。
各ステップは具体的で分かりやすく、初心者でも作れるように詳しく書いてください。

以下のJSON形式で3つのレシピを返してください:
{
  "recipes": [
    {
      "id": "recipe_1",
      "name": "料理名",
      "ingredients": [
        {"name": "材料名", "amount": "分量"}
      ],
      "steps": [
        "材料の下準備を具体的に記載",
        "次の具体的な作業",
        "さらに詳しい手順",
        "調理の具体的な方法",
        "仕上げの工程",
        "（必要に応じて手順6〜8も追加）"
      ],
      "cookingTime": 調理時間(分),
      "calories": カロリー(kcal),
      "nutrition": {
        "protein": タンパク質(g),
        "fat": 脂質(g),
        "carbs": 炭水化物(g)
      }
    }
  ]
}

重要事項:
- stepsは必ず5〜8個の詳細な手順を含めてください
- 各手順は「〜を〜する」という具体的な動作を記載
- 火加減、時間、目安となる状態なども含めてください
- 初心者でも分かるように丁寧に書いてください
- 手順には「手順1:」「手順2:」などの番号を付けないでください。手順の内容のみを記載してください

JSONのみを返してください。`;

  const response = await getRecipeModel().invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(recipePrompt),
  ]);

  try {
    const content = response.content as string;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const recipes = parsed.recipes.map((r: Recipe & { ingredients: Ingredient[] }, index: number) => ({
        id: `recipe_${Date.now()}_${index}`,
        name: r.name,
        ingredients: r.ingredients,
        steps: r.steps,
        cookingTime: r.cookingTime,
        calories: r.calories,
        nutrition: r.nutrition,
      }));
      return { recipes };
    }
  } catch (error) {
    console.error('Failed to parse recipes:', error);
  }

  return { recipes: [] };
}

async function generateResponse(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const { messages, recipes, isValidInput, userInput } = state;

  let responsePrompt: string;

  if (!isValidInput) {
    responsePrompt = `
ユーザーが「${userInput}」と言いました。
これは食材や料理に関する入力ではないようです。
自然な日本語で、丁寧に再度質問してください。例: 「申し訳ございません、よく理解できませんでした。どんな食材をお持ちですか？または、どんな料理が食べたいか教えていただけますか？」`;
  } else if (recipes.length > 0) {
    const allIngredients = [...new Set(state.ingredients)];
    responsePrompt = `
ユーザーが「${userInput}」と言いました。
${allIngredients.length > 0 ? `これまでに教えてもらった食材: ${allIngredients.join(', ')}` : ''}

以下のレシピを提案します:
${recipes.map((r, i) => `${i + 1}. ${r.name} (${r.cookingTime}分, ${r.calories}kcal)`).join('\n')}

${allIngredients.length > 0 ? `「${allIngredients.join('、')}」を使った` : ''}レシピを、自然で親しみやすい口調で紹介してください。
詳細を見たい場合はレシピ名をタップするよう促してください。
絵文字は控えめに（1〜2個程度）使ってください。`;
  } else {
    responsePrompt = `
ユーザーが「${userInput}」と言いました。
レシピを提案できませんでした。
自然な日本語で、もう少し詳しく教えてもらうよう丁寧にお願いしてください。`;
  }

  const response = await getConversationModel().invoke([
    new SystemMessage(systemPrompt),
    ...messages,
    new HumanMessage(responsePrompt),
  ]);

  const aiMessage = new AIMessage(response.content as string);

  return {
    messages: [aiMessage],
  };
}

function shouldRegenerateRecipes(state: GraphStateType): string {
  if (!state.isValidInput) {
    return 'respond';
  }
  return 'generate';
}

function determineCuisineType(message: string): string | null {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('和食') || lowerMessage.includes('和風') || lowerMessage.includes('日本料理')) {
    return '和食';
  }
  if (lowerMessage.includes('中華') || lowerMessage.includes('中国料理')) {
    return '中華';
  }
  if (lowerMessage.includes('洋食') || lowerMessage.includes('洋風') || lowerMessage.includes('イタリアン') || lowerMessage.includes('フレンチ')) {
    return '洋食';
  }
  if (lowerMessage.includes('韓国') || lowerMessage.includes('韓国料理')) {
    return '韓国料理';
  }
  
  return null;
}

function getSideDishSuggestions(recipeName: string, cuisineType: string | null): SideDish[] {
  const lowerRecipeName = recipeName.toLowerCase();
  const detectedCuisine = cuisineType || detectCuisineFromRecipeName(recipeName);
  
  if (detectedCuisine === '和食') {
    return [
      { name: '味噌汁', category: 'soup-japanese', description: '定番の味噌汁で栄養バランスを整えましょう' },
      { name: 'サラダ', category: 'salad', description: '新鮮な野菜でビタミン補給' }
    ];
  }
  
  if (detectedCuisine === '洋食') {
    return [
      { name: 'コーンスープ', category: 'soup-western', description: 'クリーミーなコーンスープ' },
      { name: 'サラダ', category: 'salad', description: 'シーザーサラダがおすすめ' }
    ];
  }
  
  if (detectedCuisine === '中華') {
    return [
      { name: 'スープ', category: 'soup-western', description: '中華スープで食事を引き立てます' },
      { name: 'サラダ', category: 'salad', description: 'さっぱりとしたサラダ' }
    ];
  }
  
  return [
    { name: 'サラダ', category: 'salad', description: '新鮮な野菜のサラダ' },
    { name: 'スープ', category: 'soup-western', description: 'お好みのスープ' }
  ];
}

function detectCuisineFromRecipeName(recipeName: string): string {
  const lowerName = recipeName.toLowerCase();
  
  const japaneseKeywords = ['煮', '焼き', '炒め', '味噌', '醤油', '照り焼き', '生姜焼き', '丼', '煮物', '唐揚げ'];
  const westernKeywords = ['パスタ', 'グラタン', 'シチュー', 'カレー', 'オムライス', 'ハンバーグ'];
  const chineseKeywords = ['麻婆', '酢豚', '回鍋肉', '青椒肉絲', 'チャーハン', '餃子'];
  
  if (japaneseKeywords.some(keyword => lowerName.includes(keyword))) {
    return '和食';
  }
  if (westernKeywords.some(keyword => lowerName.includes(keyword))) {
    return '洋食';
  }
  if (chineseKeywords.some(keyword => lowerName.includes(keyword))) {
    return '中華';
  }
  
  return '和食';
}

function getRecipeCategoryFromName(recipeName: string): string {
  const lowerName = recipeName.toLowerCase();
  
  // 優先度の高い順に判定（具体的なものから一般的なものへ）
  
  // 1. デザート系（最優先）
  if (lowerName.includes('アイス') || lowerName.includes('ケーキ') || 
      lowerName.includes('プリン') || lowerName.includes('ゼリー') ||
      lowerName.includes('デザート') || lowerName.includes('スイーツ')) {
    return 'dessert';
  }
  
  // 2. パン系
  if (lowerName.includes('パン') || lowerName.includes('トースト') ||
      lowerName.includes('サンドイッチ') || lowerName.includes('ベーグル')) {
    return 'bread';
  }
  
  // 3. 丼物系（「丼」が含まれる）
  if (lowerName.includes('丼')) {
    return 'donburi';
  }
  
  // 4. 麺類系
  if (lowerName.includes('ラーメン') || lowerName.includes('うどん') || 
      lowerName.includes('そば') || lowerName.includes('焼きそば') ||
      lowerName.includes('中華麺') || lowerName.includes('そうめん')) {
    return 'noodles';
  }
  
  // 5. パスタ系
  if (lowerName.includes('パスタ') || lowerName.includes('スパゲティ') ||
      lowerName.includes('カルボナーラ') || lowerName.includes('ペペロンチーノ')) {
    return 'pasta';
  }
  
  // 6. カレー系（シチューより前に判定）
  if (lowerName.includes('カレー') || lowerName.includes('ハヤシ')) {
    return 'curry';
  }
  
  // 7. シチュー系
  if (lowerName.includes('シチュー') || lowerName.includes('ポトフ') ||
      lowerName.includes('ビーフシチュー') || lowerName.includes('クリームシチュー')) {
    return 'stew';
  }
  
  // 8. グラタン系
  if (lowerName.includes('グラタン') || lowerName.includes('ドリア') ||
      lowerName.includes('ラザニア')) {
    return 'baked';
  }
  
  // 9. 鍋物系
  if (lowerName.includes('鍋') || lowerName.includes('すき焼き') ||
      lowerName.includes('しゃぶしゃぶ') || lowerName.includes('おでん') ||
      lowerName.includes('水炊き') || lowerName.includes('キムチ鍋')) {
    return 'hot-pot';
  }
  
  // 10. サラダ系
  if (lowerName.includes('サラダ') || lowerName.includes('コールスロー')) {
    return 'salad';
  }
  
  // 11. 汁物・スープ系
  if (lowerName.includes('味噌汁') || lowerName.includes('豚汁') ||
      lowerName.includes('けんちん汁') || lowerName.includes('お吸い物')) {
    return 'soup-japanese';
  }
  if (lowerName.includes('スープ') || lowerName.includes('ポタージュ') ||
      lowerName.includes('コンソメ') || lowerName.includes('ミネストローネ')) {
    return 'soup-western';
  }
  
  // 12. 豆腐料理系（麻婆豆腐など）
  if (lowerName.includes('麻婆豆腐') || lowerName.includes('麻婆')) {
    return 'tofu';
  }
  if (lowerName.includes('豆腐') && !lowerName.includes('炒め') && !lowerName.includes('煮')) {
    return 'tofu';
  }
  
  // 13. 卵料理系（オムライス、オムレツなど）
  if (lowerName.includes('オムライス') || lowerName.includes('オムレツ') ||
      lowerName.includes('スクランブルエッグ') || lowerName.includes('目玉焼き') ||
      lowerName.includes('だし巻き卵') || lowerName.includes('卵焼き')) {
    return 'egg-dish';
  }
  
  // 14. チャーハン・ピラフ系
  if (lowerName.includes('チャーハン') || lowerName.includes('炒飯') ||
      lowerName.includes('ピラフ') || lowerName.includes('リゾット')) {
    return 'rice';
  }
  
  // 15. 揚げ物系
  if (lowerName.includes('揚げ') || lowerName.includes('唐揚げ') || 
      lowerName.includes('天ぷら') || lowerName.includes('フライ') || 
      lowerName.includes('コロッケ') || lowerName.includes('カツ') ||
      lowerName.includes('竜田揚げ')) {
    return 'deep-fried';
  }
  
  // 16. 蒸し物系
  if (lowerName.includes('蒸し') || lowerName.includes('茶碗蒸し') ||
      lowerName.includes('レンジ蒸し') || lowerName.includes('蒸し焼き')) {
    return 'steamed';
  }
  
  // 17. 煮物系
  if (lowerName.includes('煮物') || lowerName.includes('煮付け') ||
      (lowerName.includes('煮') && !lowerName.includes('煮込み') && !lowerName.includes('炒め煮'))) {
    return 'simmered';
  }
  
  // 18-19. 焼き物系の判定（野菜の役割を区別）
  // ソース・トッピングとして扱う野菜（メイン料理の判定を妨げない）
  const sauceVegetables = ['トマトソース', 'デミグラス', 'バジルソース', 'ねぎソース', 
                           'きのこソース', '野菜ソース', 'ピューレ'];
  
  // 具材として扱う野菜（これがあれば炒め物扱い）
  const ingredientVegetables = ['野菜', 'ネギ', 'ねぎ', '葱', 'キャベツ', 'もやし', 'ピーマン', 
                                'にんじん', 'たまねぎ', '玉ねぎ', 'なす', 'ナス', 
                                'ほうれん草', '小松菜', 'ブロッコリー', 'アスパラ', 
                                'じゃがいも', 'かぼちゃ', 'きのこ', 'しいたけ', 'えのき'];
  
  // ソースとして使われているか判定
  const hasSauceVegetables = sauceVegetables.some(sauce => lowerName.includes(sauce));
  
  // 具材野菜をチェック（ただし「トマト」は単独の場合のみソース扱い）
  let hasIngredientVegetables = ingredientVegetables.some(veg => lowerName.includes(veg));
  
  // 「トマト」が含まれる場合の特別処理
  if (lowerName.includes('トマト') && !lowerName.includes('トマトソース')) {
    // 「〜とトマトの〜」のような形式はソース扱い
    if (lowerName.match(/と.*トマト/) || lowerName.match(/トマト.*ソテー/) || 
        lowerName.match(/トマト.*グリル/) || lowerName.match(/トマト.*焼き/)) {
      // トマトはソースとして扱う（具材としてカウントしない）
    } else {
      hasIngredientVegetables = true; // トマトが主役の場合は具材扱い
    }
  }
  
  // 具材野菜が含まれている場合は炒め物扱い
  if (hasIngredientVegetables && (lowerName.includes('炒め') || 
                                   (lowerName.includes('焼き') && !hasSauceVegetables))) {
    return 'stir-fry';
  }
  
  // 18. 焼き物系 - 魚（魚だけの場合）
  const fishKeywords = ['魚', 'サーモン', '鮭', 'さば', 'サバ', 'ぶり', 'ブリ', 
                        'さんま', 'サンマ', '鯖', '鰤', 'あじ', 'アジ', '鰺'];
  const hasFish = fishKeywords.some(fish => lowerName.includes(fish));
  const fishOnlyDishes = ['塩焼き', '照り焼き', 'ムニエル', 'ホイル焼き', '西京焼き'];
  
  if (hasFish && !hasVegetables && 
      (fishOnlyDishes.some(dish => lowerName.includes(dish)) || 
       (lowerName.includes('焼き') && lowerName.length < 15))) {
    return 'grilled-fish';
  }
  
  // 19. 焼き物系 - 肉（肉だけの場合）
  const meatOnlyDishes = ['ステーキ', 'ハンバーグ', 'ローストビーフ', 'ロースト', 
                          'チキングリル', 'ポークグリル'];
  const meatKeywords = ['豚', '牛', '鶏', 'チキン', 'ポーク', 'ビーフ'];
  const hasMeat = meatKeywords.some(meat => lowerName.includes(meat));
  
  if (!hasVegetables && 
      (meatOnlyDishes.some(dish => lowerName.includes(dish)) ||
       (hasMeat && lowerName.includes('ステーキ')) ||
       (hasMeat && lowerName.includes('ハンバーグ')))) {
    return 'grilled-meat';
  }
  
  // 20. 炒め物系（一般的な炒め物）
  if (lowerName.includes('炒め') || lowerName.includes('チャンプルー') ||
      (lowerName.includes('ソテー') && hasVegetables)) {
    return 'stir-fry';
  }
  
  // 21. デフォルト判定（食材から推測）
  // 具材野菜が含まれている場合は炒め物
  if (hasIngredientVegetables) {
    return 'stir-fry';
  }
  
  // 魚だけの場合は焼き魚
  if (hasFish && !hasIngredientVegetables) {
    return 'grilled-fish';
  }
  
  // 肉だけの場合は焼き肉
  if (hasMeat && !hasIngredientVegetables) {
    return 'grilled-meat';
  }
  
  // 最終デフォルト：炒め物
  return 'stir-fry';
}

const workflow = new StateGraph(GraphState)
  .addNode('analyze', analyzeInput)
  .addNode('generate', generateRecipes)
  .addNode('respond', generateResponse)
  .addEdge(START, 'analyze')
  .addConditionalEdges('analyze', shouldRegenerateRecipes, {
    generate: 'generate',
    respond: 'respond',
  })
  .addEdge('generate', 'respond')
  .addEdge('respond', END);

const app = workflow.compile();

export async function chat(
  userMessage: string,
  conversationHistory: BaseMessage[] = [],
  maxCookingTime?: number
): Promise<{ response: string; recipes: Recipe[] }> {
  const humanMessage = new HumanMessage(userMessage);

  const result = await app.invoke({
    messages: [...conversationHistory, humanMessage],
    userInput: userMessage,
    maxCookingTime: maxCookingTime || null,
  });

  const lastMessage = result.messages[result.messages.length - 1];
  const responseText = typeof lastMessage.content === 'string'
    ? lastMessage.content
    : JSON.stringify(lastMessage.content);

  return {
    response: responseText,
    recipes: result.recipes || [],
  };
}

export async function getInitialGreeting(): Promise<string> {
  const response = await getConversationModel().invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage('会話を開始してください。ユーザーに今日の食事について自然で親しみやすく質問してください。例：「こんにちは！今日は何を食べたいですか？」や「今日のご飯、何にしますか？」のような自然な表現で。'),
  ]);

  return response.content as string;
}

// ストリーミング対応のchat関数（高速化版）
export async function* chatStream(
  userMessage: string,
  userId: string,
  conversationHistory: BaseMessage[] = [],
  maxCookingTime?: number
): AsyncGenerator<{ type: 'recipe' | 'response' | 'status'; data: any }> {
  const humanMessage = new HumanMessage(userMessage);

  // 1. 入力分析（高速）
  const analysisResult = await analyzeInput({
    messages: [...conversationHistory, humanMessage],
    userInput: userMessage,
    userId,
    ingredients: [],
    recipes: [],
    isValidInput: false,
    maxCookingTime: maxCookingTime || null,
  }) as any;

  const allIngredients = [...new Set(analysisResult.ingredients || [])];
  const isValidInput = analysisResult.isValidInput;
  const specificDish = analysisResult.specificDish;
  const requestType = analysisResult.requestType;
  const missingIngredient = analysisResult.missingIngredient;

  // 2. 代替品の質問の場合、代替品の提案のみを返す
  if (isValidInput && requestType === 'substitute' && missingIngredient) {
    const substitutePrompt = `
ユーザーが料理を作ろうとしていますが、「${missingIngredient}」がありません。

会話の文脈:
${conversationHistory.slice(-3).map(msg => `${msg._getType() === 'human' ? 'ユーザー' : 'AI'}: ${msg.content}`).join('\n')}

最新の質問: "${userMessage}"

「${missingIngredient}」の代わりに使える代替品を、自然な会話形式で簡潔に答えてください。

回答のルール:
- リスト形式ではなく、自然な文章で説明する
- 最も適した代替品を1〜2つ提案する
- なぜその代替品が良いか簡潔に説明する
- 必要に応じて、なしでも作れるか伝える
- 使用量や注意点があれば添える
- 親しみやすく、わかりやすい口調で

例：「粉チーズの代わりには、とろけるチーズやスライスチーズが使えますよ。細かく刻んで加えれば、コクと風味が出て美味しく仕上がります。」
`;

    const substituteResponse = await getConversationModel().invoke([
      new SystemMessage(systemPrompt),
      ...conversationHistory,
      humanMessage,
      new HumanMessage(substitutePrompt),
    ]);

    yield { type: 'response', data: substituteResponse.content as string };
    return;
  }

  // 3. 特定の料理が要求された場合、必要な食材を提示
  if (isValidInput && specificDish) {
    const similarRecipes = searchRecipeKnowledgeBase({
      cuisineType: undefined,
      limit: 3,
    }).filter(recipe => 
      recipe.name.toLowerCase().includes(specificDish.toLowerCase()) ||
      specificDish.toLowerCase().includes(recipe.name.toLowerCase())
    );

    if (similarRecipes.length > 0) {
      const recipe = similarRecipes[0];
      const neededIngredients = recipe.ingredients.map(ing => ing.name);
      const missingIngredients = neededIngredients.filter(
        ing => !allIngredients.some(userIng => 
          ing.toLowerCase().includes(userIng.toLowerCase()) ||
          userIng.toLowerCase().includes(ing.toLowerCase())
        )
      );

      if (missingIngredients.length > 0) {
        const responseText = `「${recipe.name}」を作るには、以下の食材が必要です：\n\n` +
          `【必要な食材】\n${recipe.ingredients.map(ing => `・${ing.name} ${ing.amount}`).join('\n')}\n\n` +
          (allIngredients.length > 0 
            ? `お持ちの食材（${allIngredients.join('、')}）に加えて、以下をご用意ください：\n${missingIngredients.map(ing => `・${ing}`).join('\n')}`
            : `これらの食材をご用意ください。`);
        
        yield { type: 'response', data: responseText };
        return;
      }
    }
  }

  // 4. 嗜好を抽出・保存
  if (isValidInput) {
    extractPreferencesFromMessage(userId, userMessage, allIngredients);
  }

  // 5. ユーザーの嗜好を取得
  const userPreferences = getUserPreferences(userId);
  const preferencesText = formatPreferencesForPrompt(userPreferences);

  // 6. 無効な入力の場合は応答のみ
  if (!isValidInput) {
    const responsePrompt = `
ユーザーが「${userMessage}」と言いました。
これは食材や料理に関する入力ではないようです。
自然な日本語で、丁寧に再度質問してください。例: 「申し訳ございません、よく理解できませんでした。どんな食材をお持ちですか？または、どんな料理が食べたいか教えていただけますか？」`;
    
    const response = await getConversationModel().invoke([
      new SystemMessage(systemPrompt),
      ...conversationHistory,
      humanMessage,
      new HumanMessage(responsePrompt),
    ]);

    yield { type: 'response', data: response.content as string };
    return;
  }

  // 7. まず応答テキストを生成・送信（レシピ生成前）
  const initialResponsePrompt = `
ユーザーが「${userMessage}」と言いました。
${allIngredients.length > 0 ? `これまでに教えてもらった食材: ${allIngredients.join(', ')}` : ''}
${preferencesText ? `\n\nユーザーの嗜好（過去の履歴から）:\n${preferencesText}` : ''}

ユーザーの要望に応えるため、${allIngredients.length > 0 ? `「${allIngredients.join('、')}」を使った` : ''}レシピをこれから提案することを、自然で親しみやすい口調で伝えてください。
${preferencesText ? 'もし過去の嗜好に関連する提案なら、さりげなく触れても良いです（例：「いつもの〇〇で」「お好きな△△風に」など）。' : ''}
具体的なレシピ名は言わず、「いくつかレシピを考えました」「おすすめのレシピがあります」のような表現で、簡潔に（1-2文で）伝えてください。
絵文字は控えめに（1個程度）使ってください。`;

  const initialResponse = await getConversationModel().invoke([
    new SystemMessage(systemPrompt),
    ...conversationHistory,
    humanMessage,
    new HumanMessage(initialResponsePrompt),
  ]);

  yield { type: 'response', data: initialResponse.content as string };

  // 8. レシピを1つずつ生成・送信（重複防止のため順次生成）
  const generatedRecipeNames: string[] = [];
  const isQuickCooking = /簡単|時短|早く|手軽|すぐ|さっと/.test(userMessage);
  const effectiveMaxCookingTime = isQuickCooking ? (maxCookingTime || 20) : maxCookingTime;

  let successCount = 0;
  let attempts = 0;
  const maxAttempts = 6;

  while (successCount < 3 && attempts < maxAttempts) {
    attempts++;
    try {
      const recipe = await generateSingleRecipe(
        userMessage, 
        allIngredients, 
        conversationHistory, 
        humanMessage, 
        effectiveMaxCookingTime,
        preferencesText,
        generatedRecipeNames,
        successCount + 1
      );
      
      if (recipe) {
        generatedRecipeNames.push(recipe.name);
        yield { type: 'recipe', data: recipe };
        successCount++;
      }
    } catch (error) {
      console.error(`レシピ生成エラー (試行${attempts}回目):`, error);
    }
  }

  if (successCount < 3) {
    console.warn(`⚠️ ${successCount}個のレシピのみ生成されました（目標: 3個）`);
  }
}

// 単一レシピ生成関数（重複防止対応）
async function generateSingleRecipe(
  userInput: string,
  ingredients: string[],
  conversationHistory: BaseMessage[],
  humanMessage: BaseMessage,
  maxCookingTime: number | null,
  preferencesText: string,
  generatedRecipeNames: string[],
  recipeNumber: number
): Promise<Recipe | null> {
  const cuisineType = determineCuisineType(userInput);
  const tags = extractTagsFromMessage(userInput);
  
  const similarRecipes = searchRecipeKnowledgeBase({
    ingredients,
    cuisineType: cuisineType || undefined,
    maxCookingTime: maxCookingTime || undefined,
    tags,
    limit: 2,
  });

  const ragContext = formatRecipesForPrompt(similarRecipes);

  const recipePrompt = `
会話の流れを踏まえて、ユーザーの要望に基づいたレシピを1つ提案してください。

ユーザーの最新の入力: "${userInput}"
${ingredients.length > 0 ? `使える食材: ${ingredients.join(', ')}` : ''}
${maxCookingTime ? `調理時間制限: ${maxCookingTime}分以内` : ''}
${preferencesText ? `\n\nユーザーの嗜好（過去の履歴から）:\n${preferencesText}\n\n【重要】これらの嗜好を可能な限り考慮してレシピを提案してください。例えば、よく使う食材があれば積極的に使う、好きな料理ジャンルがあれば優先する、など。` : ''}

${ragContext ? `\n\n【参考にできるレシピ】\n以下は類似したレシピの例です。これらを参考に、ユーザーの要望に合ったレシピを提案してください。\n完全にコピーするのではなく、アイデアや手順を参考にしながら、ユーザーの要望に合わせてアレンジしてください。\n${ragContext}` : ''}

${generatedRecipeNames.length > 0 ? `\n\n【重要: 重複防止】\n以下のレシピは既に提案済みです。これらとは完全に異なる料理を提案してください:\n${generatedRecipeNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}\n\n料理名、調理法、味付けが異なる、全く別の料理を考えてください。` : ''}

【重要なルール】
1. ユーザーが特定のジャンル（和食、洋食、中華など）や料理の種類を指定している場合は、必ずそれに従ってください。
2. 提示された食材は「使える食材」であり、全てを使う必要はありません。適切な組み合わせで美味しい料理を作ってください。
3. 「簡単」「時短」「手軽」などの指示がある場合は、調理時間20分以内の簡単なレシピを優先してください。
4. レシピ番号${recipeNumber}として、他のレシピとは異なるバリエーションを提供してください。
5. 既に提案されたレシピとは完全に異なる料理を提案してください（料理名が同じにならないように）。

調理手順は必ず5〜8ステップの詳細な手順で記載してください。
各ステップは具体的で分かりやすく、初心者でも作れるように詳しく書いてください。

以下のJSON形式で1つのレシピを返してください:

{
  "recipe": {
    "name": "料理名",
    "ingredients": [
      {"name": "材料名", "amount": "分量"}
    ],
    "steps": [
      "材料の下準備を具体的に記載",
      "次の具体的な作業",
      "さらに詳しい手順",
      "調理の具体的な方法",
      "仕上げの工程"
    ],
    "cookingTime": 調理時間(分),
    "calories": カロリー(kcal),
    "nutrition": {
      "protein": タンパク質(g),
      "fat": 脂質(g),
      "carbs": 炭水化物(g)
    }
  }
}

重要事項:
- stepsは必ず5〜8個の詳細な手順を含めてください
- 各手順は「〜を〜する」という具体的な動作を記載
- 火加減、時間、目安となる状態なども含めてください
- 初心者でも分かるように丁寧に書いてください
- 手順には「手順1:」「手順2:」などの番号を付けないでください。手順の内容のみを記載してください
- 他のレシピとは異なる、ユニークなレシピを提案してください（レシピ番号: ${recipeNumber}）
- 会話の文脈（和食、中華、時短など）を必ず守ってください`;

  try {
    const response = await getRecipeModel().invoke([
      new SystemMessage(systemPrompt),
      ...conversationHistory,
      humanMessage,
      new HumanMessage(recipePrompt),
    ]);

    const content = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const r = parsed.recipe;
      
      if (generatedRecipeNames.includes(r.name)) {
        console.warn(`⚠️ 重複レシピ検出: ${r.name} - スキップします`);
        return null;
      }
      
      // レシピ名からカテゴリーを判定して画像URLを生成
      const category = getRecipeCategoryFromName(r.name);
      const imageUrl = `/images/recipe-categories/${category}.png`;
      
      // #region agent log
      const fs = await import('fs'); fs.appendFileSync('/Users/kozawa.shigeki/Documents/work/todays-meal/.cursor/debug.log', JSON.stringify({location:'agent/index.ts:685',message:'Recipe generation - category detection',data:{recipeName:r.name,category,imageUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'G-FIX'})+'\n');
      // #endregion
      
      const imageData = { imageUrl };
      
      
      if (imageData.imageUrl) {
        console.log(`📸 レシピ「${r.name}」に画像を設定: ${similarRecipes[0].name}`);
      } else {
        console.log(`⚠️ レシピ「${r.name}」に画像がありません`);
      }
      
      const sideDishes = getSideDishSuggestions(r.name, cuisineType);
      console.log(`🍽️ レシピ「${r.name}」の付け合わせ: ${sideDishes.map(s => s.name).join(', ')}`);
      
      const finalRecipe = {
        id: `recipe_${Date.now()}_${recipeNumber}_${Math.random().toString(36).substr(2, 9)}`,
        name: r.name,
        ingredients: r.ingredients,
        steps: r.steps,
        cookingTime: r.cookingTime,
        calories: r.calories,
        nutrition: r.nutrition,
        sideDishes,
        ...imageData,
      };
      
      // #region agent log
      const fs3 = await import('fs'); fs3.appendFileSync('/Users/kozawa.shigeki/Documents/work/todays-meal/.cursor/debug.log', JSON.stringify({location:'agent/index.ts:710',message:'Recipe generation - final recipe object',data:{recipeName:finalRecipe.name,hasImageUrl:!!finalRecipe.imageUrl,imageUrl:finalRecipe.imageUrl,recipeKeys:Object.keys(finalRecipe)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,C,G'})+'\n');
      // #endregion
      
      return finalRecipe;
    }
  } catch (error) {
    console.error(`レシピ${recipeNumber}の生成に失敗:`, error);
  }

  return null;
}

