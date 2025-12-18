import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { StateGraph, Annotation, END, START } from '@langchain/langgraph';
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from '@langchain/core/messages';
import { Recipe, Ingredient } from '../types/index.js';

const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  userInput: Annotation<string>({
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

重要な会話の文脈理解ルール:
- 会話履歴から、ユーザーが教えてくれた食材を全て記憶すること
- 新しい食材が追加された場合、以前の食材と合わせて考慮すること
- 例: 「ネギと豚バラがある」→「ナスを買ってきた」の場合、「ネギ、豚バラ、ナス」の3つ全てを使ったレシピを提案
- ユーザーが「他に何か作れる？」と聞いた場合、これまで教えてもらった全ての食材を使った別のレシピを提案
- 食材リストは会話の最初から累積的に増えていく

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
  "requestType": "ingredients" | "mood" | "specific" | "other"
}

重要: 
- 既存の食材は含めず、今回の入力から新たに追加される食材のみを返してください
- 「他に何か作れる？」のような質問の場合、ingredientsは空配列にしてください

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
  conversationHistory: BaseMessage[] = [],
  maxCookingTime?: number
): AsyncGenerator<{ type: 'recipe' | 'response' | 'status'; data: any }> {
  const humanMessage = new HumanMessage(userMessage);

  // 1. 入力分析（高速）
  const analysisResult = await analyzeInput({
    messages: [...conversationHistory, humanMessage],
    userInput: userMessage,
    ingredients: [],
    recipes: [],
    isValidInput: false,
    maxCookingTime: maxCookingTime || null,
  });

  const allIngredients = [...new Set(analysisResult.ingredients || [])];
  const isValidInput = analysisResult.isValidInput;

  // 2. 応答テキストを先に生成・送信（1-2秒で応答開始）
  if (!isValidInput) {
    // 無効な入力の場合
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

  // 3. レシピ生成が必要な場合、まず簡易応答を送信
  yield { 
    type: 'status', 
    data: `${allIngredients.length > 0 ? `「${allIngredients.join('、')}」を使った` : ''}レシピを考えています...` 
  };

  // 4. レシピを1つずつ生成・送信（並列化で高速化）
  const recipePromises = [];
  for (let i = 0; i < 3; i++) {
    recipePromises.push(generateSingleRecipe(userMessage, allIngredients, maxCookingTime, i + 1));
  }

  // レシピが完成次第、順次送信
  const recipes: Recipe[] = [];
  for (const promise of recipePromises) {
    try {
      const recipe = await promise;
      if (recipe) {
        recipes.push(recipe);
        yield { type: 'recipe', data: recipe };
      }
    } catch (error) {
      console.error('レシピ生成エラー:', error);
    }
  }

  // 5. 最終的な応答テキストを生成・送信
  const responsePrompt = `
ユーザーが「${userMessage}」と言いました。
${allIngredients.length > 0 ? `これまでに教えてもらった食材: ${allIngredients.join(', ')}` : ''}

以下のレシピを提案します:
${recipes.map((r, i) => `${i + 1}. ${r.name} (${r.cookingTime}分, ${r.calories}kcal)`).join('\n')}

${allIngredients.length > 0 ? `「${allIngredients.join('、')}」を使った` : ''}レシピを、自然で親しみやすい口調で紹介してください。
詳細を見たい場合はレシピ名をタップするよう促してください。
絵文字は控えめに（1〜2個程度）使ってください。`;

  const response = await getConversationModel().invoke([
    new SystemMessage(systemPrompt),
    ...conversationHistory,
    humanMessage,
    new HumanMessage(responsePrompt),
  ]);

  yield { type: 'response', data: response.content as string };
}

// 単一レシピ生成関数（並列化用）
async function generateSingleRecipe(
  userInput: string,
  ingredients: string[],
  maxCookingTime: number | null,
  recipeNumber: number
): Promise<Recipe | null> {
  const recipePrompt = `
ユーザーの要望に基づいて、1つのレシピを提案してください。

ユーザーの入力: "${userInput}"
${ingredients.length > 0 ? `使用する食材: ${ingredients.join(', ')}` : ''}
${maxCookingTime ? `調理時間制限: ${maxCookingTime}分以内` : ''}

重要: ${ingredients.length > 0 ? `可能な限り「${ingredients.join(', ')}」を使ったレシピを提案してください。` : ''}

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
- 他のレシピとは異なる、ユニークなレシピを提案してください（レシピ番号: ${recipeNumber}）`;

  try {
    const response = await getRecipeModel().invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(recipePrompt),
    ]);

    const content = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const r = parsed.recipe;
      return {
        id: `recipe_${Date.now()}_${recipeNumber}`,
        name: r.name,
        ingredients: r.ingredients,
        steps: r.steps,
        cookingTime: r.cookingTime,
        calories: r.calories,
        nutrition: r.nutrition,
      };
    }
  } catch (error) {
    console.error(`レシピ${recipeNumber}の生成に失敗:`, error);
  }

  return null;
}

