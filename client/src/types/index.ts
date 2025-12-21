export interface User {
  id: string
  email: string
  name: string
}

export interface SideDish {
  name: string
  category: string
  description?: string
}

export interface Recipe {
  id: string
  name: string
  ingredients: Ingredient[]
  steps: string[]
  cookingTime: number
  calories: number
  nutrition: Nutrition
  imageUrl?: string
  sourceUrl?: string
  sourceName?: string
  favorited_at?: string
  created_at?: string
  sideDishes?: SideDish[]
}

export interface Ingredient {
  name: string
  amount: string
}

export interface Nutrition {
  protein: number
  fat: number
  carbs: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  recipes?: Recipe[]
  created_at?: string
}

export interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count?: number
}

