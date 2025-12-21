export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface SideDish {
  name: string;
  category: string;
  description?: string;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  steps: string[];
  cookingTime: number;
  calories: number;
  nutrition: {
    protein: number;
    fat: number;
    carbs: number;
  };
  sideDishes?: SideDish[];
}

export interface Ingredient {
  name: string;
  amount: string;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  filters?: {
    maxCookingTime?: number;
  };
}

export interface ChatResponse {
  message: string;
  recipes?: Recipe[];
  conversationId: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
}

export interface UserPreference {
  id: string;
  user_id: string;
  preference_type: 'favorite_ingredient' | 'dislike_ingredient' | 'cuisine_type' | 'dietary_restriction' | 'cooking_time' | 'other';
  preference_key: string;
  preference_value: string;
  frequency: number;
  last_used: string;
  created_at: string;
  updated_at: string;
}

export interface RecipeKnowledgeBase extends Recipe {
  description?: string;
  cuisine_type?: string;
  tags?: string[];
  difficulty?: string;
  source?: string;
  imageUrl?: string;
  sourceUrl?: string;
  sourceName?: string;
  embedding?: number[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

