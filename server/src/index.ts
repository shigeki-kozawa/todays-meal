import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { authRouter } from './routes/auth.js';
import { chatRouter } from './routes/chat.js';
import { favoritesRouter } from './routes/favorites.js';
import { historyRouter } from './routes/history.js';
import { initDatabase } from './db/index.js';
import { seedRecipeKnowledgeBase } from './data/seed-recipes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
}));
app.use(express.json());

async function initializeApp() {
  initDatabase();
  await seedRecipeKnowledgeBase();
}

initializeApp().catch(error => {
  console.error('❌ アプリケーションの初期化に失敗しました:', error);
  process.exit(1);
});

app.use('/api/auth', authRouter);
app.use('/api/chat', chatRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/history', historyRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🍳 今日のご飯サーバーが起動しました: http://localhost:${PORT}`);
});

