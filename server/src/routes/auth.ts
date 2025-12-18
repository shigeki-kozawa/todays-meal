import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import { getDatabase } from '../db/index.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';

export const authRouter = Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'メールアドレス、パスワード、名前は必須です' });
      return;
    }

    const db = getDatabase();
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

    if (existingUser) {
      res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
      return;
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    db.prepare(
      'INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)'
    ).run(id, email, passwordHash, name);

    const token = generateToken({ userId: id, email });

    res.status(201).json({
      user: { id, email, name },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: '登録に失敗しました' });
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'メールアドレスとパスワードは必須です' });
      return;
    }

    const db = getDatabase();
    const user = db.prepare(
      'SELECT id, email, password_hash, name FROM users WHERE email = ?'
    ).get(email) as { id: string; email: string; password_hash: string; name: string } | undefined;

    if (!user) {
      res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
      return;
    }

    if (!user.password_hash) {
      res.status(401).json({ error: 'このアカウントはGoogleログインで登録されています' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
      return;
    }

    const token = generateToken({ userId: user.id, email: user.email });

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'ログインに失敗しました' });
  }
});

authRouter.post('/google', async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      res.status(400).json({ error: 'Google認証情報が必要です' });
      return;
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    
    if (!payload || !payload.email) {
      res.status(400).json({ error: 'Google認証に失敗しました' });
      return;
    }

    const { email, name, sub: googleId, picture } = payload;
    const db = getDatabase();

    let user = db.prepare(
      'SELECT id, email, name, google_id, avatar_url FROM users WHERE email = ? OR google_id = ?'
    ).get(email, googleId) as { 
      id: string; 
      email: string; 
      name: string; 
      google_id: string | null;
      avatar_url: string | null;
    } | undefined;

    if (user) {
      if (!user.google_id) {
        db.prepare(
          'UPDATE users SET google_id = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(googleId, picture, user.id);
      }
    } else {
      const id = uuidv4();
      db.prepare(
        'INSERT INTO users (id, email, name, google_id, avatar_url) VALUES (?, ?, ?, ?, ?)'
      ).run(id, email, name || email.split('@')[0], googleId, picture);
      
      user = {
        id,
        email: email!,
        name: name || email!.split('@')[0],
        google_id: googleId!,
        avatar_url: picture || null,
      };
    }

    const token = generateToken({ userId: user.id, email: user.email });

    res.json({
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        avatarUrl: picture || user.avatar_url,
      },
      token,
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google認証に失敗しました' });
  }
});

authRouter.get('/me', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const user = db.prepare(
      'SELECT id, email, name, avatar_url, created_at FROM users WHERE id = ?'
    ).get(req.user!.userId) as { 
      id: string; 
      email: string; 
      name: string; 
      avatar_url: string | null;
      created_at: string;
    } | undefined;

    if (!user) {
      res.status(404).json({ error: 'ユーザーが見つかりません' });
      return;
    }

    res.json({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'ユーザー情報の取得に失敗しました' });
  }
});
