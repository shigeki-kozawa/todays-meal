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

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

