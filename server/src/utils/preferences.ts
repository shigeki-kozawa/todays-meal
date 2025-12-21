import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/index.js';
import { UserPreference } from '../types/index.js';

export function getUserPreferences(userId: string): UserPreference[] {
  const db = getDatabase();
  const preferences = db.prepare(`
    SELECT * FROM user_preferences
    WHERE user_id = ?
    ORDER BY frequency DESC, last_used DESC
  `).all(userId) as UserPreference[];
  return preferences;
}

export function updatePreference(
  userId: string,
  preferenceType: UserPreference['preference_type'],
  preferenceKey: string,
  preferenceValue: string
): void {
  const db = getDatabase();
  
  const existing = db.prepare(`
    SELECT * FROM user_preferences
    WHERE user_id = ? AND preference_type = ? AND preference_key = ?
  `).get(userId, preferenceType, preferenceKey) as UserPreference | undefined;

  if (existing) {
    db.prepare(`
      UPDATE user_preferences
      SET frequency = frequency + 1, last_used = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(existing.id);
  } else {
    db.prepare(`
      INSERT INTO user_preferences (id, user_id, preference_type, preference_key, preference_value)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, preferenceType, preferenceKey, preferenceValue);
  }
}

export function extractPreferencesFromMessage(
  userId: string,
  message: string,
  ingredients: string[]
): void {
  const lowerMessage = message.toLowerCase();
  
  const cuisineTypes = [
    { keywords: ['和食', '和風', '日本料理'], type: '和食' },
    { keywords: ['中華', '中国料理'], type: '中華' },
    { keywords: ['洋食', '洋風', 'イタリアン', 'フレンチ'], type: '洋食' },
    { keywords: ['韓国', '韓国料理'], type: '韓国料理' },
  ];

  for (const cuisine of cuisineTypes) {
    if (cuisine.keywords.some(keyword => lowerMessage.includes(keyword))) {
      updatePreference(userId, 'cuisine_type', cuisine.type, cuisine.type);
    }
  }

  for (const ingredient of ingredients) {
    updatePreference(userId, 'favorite_ingredient', ingredient, ingredient);
  }

  if (lowerMessage.includes('時短') || lowerMessage.includes('早く') || lowerMessage.includes('簡単')) {
    updatePreference(userId, 'cooking_time', 'short', '30分以内');
  }

  if (lowerMessage.includes('健康') || lowerMessage.includes('ヘルシー') || lowerMessage.includes('低カロリー')) {
    updatePreference(userId, 'dietary_restriction', 'healthy', '低カロリー');
  }

  if (lowerMessage.includes('辛い') || lowerMessage.includes('スパイシー')) {
    updatePreference(userId, 'other', 'spicy', '辛いもの好き');
  }
}

export function formatPreferencesForPrompt(preferences: UserPreference[]): string {
  if (preferences.length === 0) {
    return '';
  }

  const grouped: Record<string, UserPreference[]> = {};
  for (const pref of preferences) {
    if (!grouped[pref.preference_type]) {
      grouped[pref.preference_type] = [];
    }
    grouped[pref.preference_type].push(pref);
  }

  const parts: string[] = [];

  if (grouped.favorite_ingredient) {
    const top5 = grouped.favorite_ingredient.slice(0, 5);
    parts.push(`よく使う食材: ${top5.map(p => p.preference_value).join('、')}`);
  }

  if (grouped.cuisine_type) {
    const topCuisine = grouped.cuisine_type[0];
    parts.push(`好きな料理ジャンル: ${topCuisine.preference_value}`);
  }

  if (grouped.cooking_time) {
    const timePref = grouped.cooking_time[0];
    parts.push(`調理時間の好み: ${timePref.preference_value}`);
  }

  if (grouped.dietary_restriction) {
    const dietPref = grouped.dietary_restriction[0];
    parts.push(`食事の好み: ${dietPref.preference_value}`);
  }

  if (grouped.dislike_ingredient) {
    const dislikes = grouped.dislike_ingredient.slice(0, 3);
    parts.push(`苦手な食材: ${dislikes.map(p => p.preference_value).join('、')}`);
  }

  return parts.join('\n');
}

