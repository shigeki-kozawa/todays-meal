import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

export const historyRouter = Router();

historyRouter.use(authMiddleware);

historyRouter.get('/', (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { limit = 10, offset = 0 } = req.query;
    const db = getDatabase();

    const conversations = db.prepare(`
      SELECT 
        c.id,
        c.title,
        c.created_at,
        c.updated_at,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
      FROM conversations c
      WHERE c.user_id = ?
      ORDER BY c.updated_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, Number(limit), Number(offset));

    const total = db.prepare(
      'SELECT COUNT(*) as count FROM conversations WHERE user_id = ?'
    ).get(userId) as { count: number };

    res.json({
      conversations,
      total: total.count,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: '履歴の取得に失敗しました' });
  }
});

historyRouter.get('/recipes', (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { limit = 20, offset = 0, sortBy = 'created_at', order = 'desc' } = req.query;
    const db = getDatabase();

    const validSortColumns = ['created_at', 'cooking_time', 'calories', 'name'];
    const sortColumn = validSortColumns.includes(sortBy as string) ? sortBy : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const recipes = db.prepare(`
      SELECT DISTINCT
        r.id, r.name, r.ingredients, r.steps, r.cooking_time as cookingTime,
        r.calories, r.protein, r.fat, r.carbs, r.created_at
      FROM recipes r
      INNER JOIN messages m ON m.content LIKE '%' || r.name || '%'
      INNER JOIN conversations c ON m.conversation_id = c.id
      WHERE c.user_id = ?
      ORDER BY r.${sortColumn} ${sortOrder}
      LIMIT ? OFFSET ?
    `).all(userId, Number(limit), Number(offset)) as Array<{
      id: string;
      name: string;
      ingredients: string;
      steps: string;
      cookingTime: number;
      calories: number;
      protein: number;
      fat: number;
      carbs: number;
      created_at: string;
    }>;

    const formattedRecipes = recipes.map((r) => ({
      id: r.id,
      name: r.name,
      ingredients: JSON.parse(r.ingredients),
      steps: JSON.parse(r.steps),
      cookingTime: r.cookingTime,
      calories: r.calories,
      nutrition: {
        protein: r.protein,
        fat: r.fat,
        carbs: r.carbs,
      },
      created_at: r.created_at,
    }));

    res.json({ recipes: formattedRecipes });
  } catch (error) {
    console.error('Get recipe history error:', error);
    res.status(500).json({ error: 'レシピ履歴の取得に失敗しました' });
  }
});

historyRouter.delete('/conversations/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const db = getDatabase();

    const conversation = db.prepare(
      'SELECT id FROM conversations WHERE id = ? AND user_id = ?'
    ).get(id, userId);

    if (!conversation) {
      res.status(404).json({ error: '会話が見つかりません' });
      return;
    }

    db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(id);
    db.prepare('DELETE FROM conversations WHERE id = ?').run(id);

    res.json({ message: '会話を削除しました' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: '会話の削除に失敗しました' });
  }
});

