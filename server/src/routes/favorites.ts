import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

export const favoritesRouter = Router();

favoritesRouter.use(authMiddleware);

favoritesRouter.get('/', (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const db = getDatabase();

    const favorites = db.prepare(`
      SELECT 
        r.id, r.name, r.ingredients, r.steps, r.cooking_time as cookingTime,
        r.calories, r.protein, r.fat, r.carbs, f.created_at as favorited_at
      FROM favorites f
      JOIN recipes r ON f.recipe_id = r.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `).all(userId) as Array<{
      id: string;
      name: string;
      ingredients: string;
      steps: string;
      cookingTime: number;
      calories: number;
      protein: number;
      fat: number;
      carbs: number;
      favorited_at: string;
    }>;

    const formattedFavorites = favorites.map((f) => ({
      id: f.id,
      name: f.name,
      ingredients: JSON.parse(f.ingredients),
      steps: JSON.parse(f.steps),
      cookingTime: f.cookingTime,
      calories: f.calories,
      nutrition: {
        protein: f.protein,
        fat: f.fat,
        carbs: f.carbs,
      },
      favorited_at: f.favorited_at,
    }));

    res.json({ favorites: formattedFavorites });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'お気に入りの取得に失敗しました' });
  }
});

favoritesRouter.post('/', (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { recipeId } = req.body;

    if (!recipeId) {
      res.status(400).json({ error: 'レシピIDは必須です' });
      return;
    }

    const db = getDatabase();

    const recipe = db.prepare('SELECT id FROM recipes WHERE id = ?').get(recipeId);
    if (!recipe) {
      res.status(404).json({ error: 'レシピが見つかりません' });
      return;
    }

    const existing = db.prepare(
      'SELECT id FROM favorites WHERE user_id = ? AND recipe_id = ?'
    ).get(userId, recipeId);

    if (existing) {
      res.status(400).json({ error: '既にお気に入りに追加されています' });
      return;
    }

    const id = uuidv4();
    db.prepare(
      'INSERT INTO favorites (id, user_id, recipe_id) VALUES (?, ?, ?)'
    ).run(id, userId, recipeId);

    res.status(201).json({ message: 'お気に入りに追加しました', id });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ error: 'お気に入りの追加に失敗しました' });
  }
});

favoritesRouter.delete('/:recipeId', (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { recipeId } = req.params;
    const db = getDatabase();

    const result = db.prepare(
      'DELETE FROM favorites WHERE user_id = ? AND recipe_id = ?'
    ).run(userId, recipeId);

    if (result.changes === 0) {
      res.status(404).json({ error: 'お気に入りが見つかりません' });
      return;
    }

    res.json({ message: 'お気に入りから削除しました' });
  } catch (error) {
    console.error('Delete favorite error:', error);
    res.status(500).json({ error: 'お気に入りの削除に失敗しました' });
  }
});

favoritesRouter.get('/check/:recipeId', (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { recipeId } = req.params;
    const db = getDatabase();

    const favorite = db.prepare(
      'SELECT id FROM favorites WHERE user_id = ? AND recipe_id = ?'
    ).get(userId, recipeId);

    res.json({ isFavorite: !!favorite });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({ error: 'お気に入り状態の確認に失敗しました' });
  }
});

