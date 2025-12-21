import { getDatabase } from '../db/index.js';
import { RecipeKnowledgeBase } from '../types/index.js';

interface SearchParams {
  ingredients?: string[];
  cuisineType?: string;
  maxCookingTime?: number;
  tags?: string[];
  limit?: number;
}

export function searchRecipeKnowledgeBase(params: SearchParams): RecipeKnowledgeBase[] {
  const db = getDatabase();
  const { ingredients = [], cuisineType, maxCookingTime, tags = [], limit = 5 } = params;

  let query = 'SELECT * FROM recipe_knowledge_base WHERE 1=1';
  const queryParams: any[] = [];

  if (cuisineType) {
    query += ' AND cuisine_type = ?';
    queryParams.push(cuisineType);
  }

  if (maxCookingTime) {
    query += ' AND cooking_time <= ?';
    queryParams.push(maxCookingTime);
  }

  query += ' ORDER BY cooking_time ASC LIMIT ?';
  queryParams.push(limit);

  const results = db.prepare(query).all(...queryParams) as any[];

  const recipes: RecipeKnowledgeBase[] = results.map(row => ({
    id: row.id,
    name: row.name,
    description: row.description,
    ingredients: JSON.parse(row.ingredients),
    steps: JSON.parse(row.steps),
    cookingTime: row.cooking_time,
    calories: row.calories,
    nutrition: {
      protein: row.protein,
      fat: row.fat,
      carbs: row.carbs,
    },
    cuisineType: row.cuisine_type,
    tags: JSON.parse(row.tags || '[]'),
    difficulty: row.difficulty,
    source: row.source,
    imageUrl: row.image_url,
    sourceUrl: row.source_url,
    sourceName: row.source_name,
  }));

  if (ingredients.length > 0 || tags.length > 0) {
    return recipes
      .map(recipe => {
        let score = 0;

        for (const ingredient of ingredients) {
          const recipeIngredients = recipe.ingredients.map(i => i.name.toLowerCase());
          if (recipeIngredients.some(ri => ri.includes(ingredient.toLowerCase()))) {
            score += 10;
          }
          if (recipe.name.toLowerCase().includes(ingredient.toLowerCase())) {
            score += 5;
          }
          if (recipe.description?.toLowerCase().includes(ingredient.toLowerCase())) {
            score += 3;
          }
        }

        for (const tag of tags) {
          if (recipe.tags?.some(t => t.toLowerCase().includes(tag.toLowerCase()))) {
            score += 5;
          }
        }

        return { recipe, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.recipe);
  }

  return recipes;
}

export function formatRecipesForPrompt(recipes: RecipeKnowledgeBase[]): string {
  if (recipes.length === 0) {
    return '';
  }

  return recipes.map((recipe, index) => {
    return `
【参考レシピ${index + 1}】
名前: ${recipe.name}
説明: ${recipe.description}
材料: ${recipe.ingredients.map(i => `${i.name} ${i.amount}`).join(', ')}
手順: ${recipe.steps.join(' → ')}
調理時間: ${recipe.cookingTime}分
カロリー: ${recipe.calories}kcal
料理ジャンル: ${recipe.cuisine_type}
難易度: ${recipe.difficulty}
`;
  }).join('\n');
}

export function extractTagsFromMessage(message: string): string[] {
  const tags: string[] = [];
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('簡単') || lowerMessage.includes('時短') || lowerMessage.includes('手軽') || lowerMessage.includes('早く') || lowerMessage.includes('すぐ') || lowerMessage.includes('さっと')) {
    tags.push('簡単', '時短');
  }

  if (lowerMessage.includes('ヘルシー') || lowerMessage.includes('健康') || lowerMessage.includes('低カロリー')) {
    tags.push('ヘルシー');
  }

  if (lowerMessage.includes('辛い') || lowerMessage.includes('スパイシー') || lowerMessage.includes('ピリ辛')) {
    tags.push('辛い', 'スパイシー');
  }

  if (lowerMessage.includes('ご飯') || lowerMessage.includes('白米') || lowerMessage.includes('おかず')) {
    tags.push('ご飯に合う');
  }

  if (lowerMessage.includes('野菜') || lowerMessage.includes('野菜たっぷり')) {
    tags.push('野菜たっぷり');
  }

  if (lowerMessage.includes('本格') || lowerMessage.includes('本格的')) {
    tags.push('本格的');
  }

  return tags;
}

