import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { chat, chatStream, getInitialGreeting } from '../agent/index.js';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { Recipe } from '../types/index.js';
import Database from 'better-sqlite3';

export const chatRouter = Router();

// 古い会話を削除して最大10件まで保持
function cleanupOldConversations(db: Database.Database, userId: string) {
  try {
    // ユーザーの会話数を確認
    const countResult = db.prepare(
      'SELECT COUNT(*) as count FROM conversations WHERE user_id = ?'
    ).get(userId) as { count: number };

    const MAX_CONVERSATIONS = 10;

    if (countResult.count > MAX_CONVERSATIONS) {
      // 古い会話を取得（最新10件以外）
      const oldConversations = db.prepare(`
        SELECT id FROM conversations
        WHERE user_id = ?
        ORDER BY updated_at DESC
        LIMIT -1 OFFSET ?
      `).all(userId, MAX_CONVERSATIONS) as Array<{ id: string }>;

      // 古い会話とそのメッセージを削除
      for (const conv of oldConversations) {
        db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(conv.id);
        db.prepare('DELETE FROM conversations WHERE id = ?').run(conv.id);
      }

      console.log(`🧹 古い会話を削除しました: ${oldConversations.length}件`);
    }
  } catch (error) {
    console.error('会話のクリーンアップに失敗しました:', error);
  }
}

chatRouter.use(authMiddleware);

chatRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const db = getDatabase();

    const conversationId = uuidv4();
    const greeting = await getInitialGreeting();

    db.prepare(
      'INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)'
    ).run(conversationId, userId, '新しい会話');

    // 古い会話を削除して最大10件まで保持
    cleanupOldConversations(db, userId);

    const messageId = uuidv4();
    db.prepare(
      'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)'
    ).run(messageId, conversationId, 'assistant', greeting);

    res.json({
      conversationId,
      message: greeting,
      recipes: [],
    });
  } catch (error) {
    console.error('Start chat error:', error);
    res.status(500).json({ error: 'チャットの開始に失敗しました' });
  }
});

chatRouter.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { message, conversationId, filters, stream } = req.body;

    console.log('=== チャットリクエスト受信 ===');
    console.log('userId:', userId);
    console.log('message:', message);
    console.log('conversationId:', conversationId);
    console.log('filters:', filters);
    console.log('stream:', stream);

    if (!message) {
      console.error('エラー: メッセージが空です');
      res.status(400).json({ error: 'メッセージは必須です' });
      return;
    }

    const db = getDatabase();
    let convId = conversationId;

    if (!convId) {
      convId = uuidv4();
      console.log('新しい会話を作成:', convId);
      db.prepare(
        'INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)'
      ).run(convId, userId, message.slice(0, 50));

      // 古い会話を削除して最大10件まで保持
      cleanupOldConversations(db, userId);
    }

    const userMessageId = uuidv4();
    db.prepare(
      'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)'
    ).run(userMessageId, convId, 'user', message);
    console.log('ユーザーメッセージをDB保存完了');

    const history = db.prepare(
      'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
    ).all(convId) as { role: string; content: string }[];
    console.log('会話履歴取得:', history.length, '件');

    const conversationHistory: BaseMessage[] = history.slice(0, -1).map((msg) =>
      msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
    );

    // ストリーミングモード
    if (stream) {
      console.log('ストリーミングモード開始');
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // 会話IDを最初に送信
      res.write(`data: ${JSON.stringify({ type: 'conversationId', data: convId })}\n\n`);

      const recipes: Recipe[] = [];
      let responseText = '';

      try {
        console.log('AI処理開始: chatStream関数を呼び出します');
        for await (const chunk of chatStream(message, userId, conversationHistory, filters?.maxCookingTime)) {
          console.log('チャンクを受信:', chunk.type);
          if (chunk.type === 'recipe') {
            recipes.push(chunk.data as Recipe);
            res.write(`data: ${JSON.stringify({ type: 'recipe', data: chunk.data })}\n\n`);
          } else if (chunk.type === 'response') {
            responseText = chunk.data as string;
            res.write(`data: ${JSON.stringify({ type: 'response', data: chunk.data })}\n\n`);
          }
        }
        console.log('AI処理完了: recipes=', recipes.length, '件, responseText=', responseText.length, '文字');

        // データベースに保存
        const assistantMessageId = uuidv4();
        db.prepare(
          'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)'
        ).run(assistantMessageId, convId, 'assistant', responseText);
        console.log('アシスタントメッセージをDB保存完了');

        if (recipes.length > 0) {
          for (const recipe of recipes) {
            const existingRecipe = db.prepare('SELECT id FROM recipes WHERE id = ?').get(recipe.id);
            if (!existingRecipe) {
              db.prepare(`
                INSERT INTO recipes (id, name, ingredients, steps, cooking_time, calories, protein, fat, carbs, image_url, source_url, source_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                recipe.id,
                recipe.name,
                JSON.stringify(recipe.ingredients),
                JSON.stringify(recipe.steps),
                recipe.cookingTime,
                recipe.calories,
                recipe.nutrition.protein,
                recipe.nutrition.fat,
                recipe.nutrition.carbs,
                recipe.imageUrl || null,
                recipe.sourceUrl || null,
                recipe.sourceName || null
              );
            }
          }
          console.log('レシピをDB保存完了:', recipes.length, '件');
        }

        db.prepare(
          'UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(message.slice(0, 50), convId);

        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
        console.log('=== チャットリクエスト完了 ===');
      } catch (error) {
        console.error('❌ Stream error:', error);
        console.error('エラー詳細:', error instanceof Error ? error.message : String(error));
        console.error('スタックトレース:', error instanceof Error ? error.stack : 'N/A');
        res.write(`data: ${JSON.stringify({ type: 'error', data: 'エラーが発生しました' })}\n\n`);
        res.end();
      }
    } else {
      // 通常モード（後方互換性のため）
      const result = await chat(message, conversationHistory, filters?.maxCookingTime);

      const assistantMessageId = uuidv4();
      db.prepare(
        'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)'
      ).run(assistantMessageId, convId, 'assistant', result.response);

      if (result.recipes.length > 0) {
        for (const recipe of result.recipes) {
          const existingRecipe = db.prepare('SELECT id FROM recipes WHERE id = ?').get(recipe.id);
          if (!existingRecipe) {
            db.prepare(`
              INSERT INTO recipes (id, name, ingredients, steps, cooking_time, calories, protein, fat, carbs, image_url, source_url, source_name)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              recipe.id,
              recipe.name,
              JSON.stringify(recipe.ingredients),
              JSON.stringify(recipe.steps),
              recipe.cookingTime,
              recipe.calories,
              recipe.nutrition.protein,
              recipe.nutrition.fat,
              recipe.nutrition.carbs,
              recipe.imageUrl || null,
              recipe.sourceUrl || null,
              recipe.sourceName || null
            );
          }
        }
      }

      db.prepare(
        'UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(message.slice(0, 50), convId);

      res.json({
        conversationId: convId,
        message: result.response,
        recipes: result.recipes,
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'メッセージの送信に失敗しました' });
  }
});

chatRouter.get('/conversations', (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const db = getDatabase();

    const conversations = db.prepare(`
      SELECT id, title, created_at, updated_at
      FROM conversations
      WHERE user_id = ?
      ORDER BY updated_at DESC
      LIMIT 10
    `).all(userId);

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: '会話一覧の取得に失敗しました' });
  }
});

chatRouter.get('/conversations/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const db = getDatabase();

    const conversation = db.prepare(`
      SELECT id, title, created_at, updated_at
      FROM conversations
      WHERE id = ? AND user_id = ?
    `).get(id, userId);

    if (!conversation) {
      res.status(404).json({ error: '会話が見つかりません' });
      return;
    }

    const messages = db.prepare(`
      SELECT id, role, content, created_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `).all(id);

    res.json({ conversation, messages });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: '会話の取得に失敗しました' });
  }
});

