const API_BASE = import.meta.env.VITE_API_URL || '/api'

interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
}

interface Recipe {
  id: string
  name: string
  ingredients: { name: string; amount: string }[]
  steps: string[]
  cookingTime: number
  calories: number
  nutrition: {
    protein: number
    fat: number
    carbs: number
  }
}

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count?: number
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'エラーが発生しました' }))
    throw new Error(error.error || 'エラーが発生しました')
  }

  return response.json()
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name: string) =>
    request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  googleAuth: (credential: string) =>
    request<{ user: User; token: string }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    }),

  getMe: (token: string) =>
    request<{ user: User }>('/auth/me', {}, token),

  startChat: (token: string) =>
    request<{ conversationId: string; message: string; recipes: Recipe[] }>(
      '/chat/start',
      { method: 'POST' },
      token
    ),

  sendMessage: (
    token: string,
    message: string,
    conversationId?: string,
    filters?: { maxCookingTime?: number }
  ) =>
    request<{ conversationId: string; message: string; recipes: Recipe[] }>(
      '/chat',
      {
        method: 'POST',
        body: JSON.stringify({ message, conversationId, filters }),
      },
      token
    ),

  getConversations: (token: string) =>
    request<{ conversations: Conversation[] }>('/chat/conversations', {}, token),

  getConversation: (token: string, id: string) =>
    request<{ conversation: Conversation; messages: Message[] }>(
      `/chat/conversations/${id}`,
      {},
      token
    ),

  getFavorites: (token: string) =>
    request<{ favorites: Recipe[] }>('/favorites', {}, token),

  addFavorite: (token: string, recipeId: string) =>
    request<{ message: string; id: string }>(
      '/favorites',
      { method: 'POST', body: JSON.stringify({ recipeId }) },
      token
    ),

  removeFavorite: (token: string, recipeId: string) =>
    request<{ message: string }>(`/favorites/${recipeId}`, { method: 'DELETE' }, token),

  checkFavorite: (token: string, recipeId: string) =>
    request<{ isFavorite: boolean }>(`/favorites/check/${recipeId}`, {}, token),

  getHistory: (token: string, limit = 20, offset = 0) =>
    request<{ conversations: Conversation[]; total: number }>(
      `/history?limit=${limit}&offset=${offset}`,
      {},
      token
    ),

  getRecipeHistory: (
    token: string,
    sortBy = 'created_at',
    order = 'desc',
    limit = 20,
    offset = 0
  ) =>
    request<{ recipes: Recipe[] }>(
      `/history/recipes?sortBy=${sortBy}&order=${order}&limit=${limit}&offset=${offset}`,
      {},
      token
    ),

  deleteConversation: (token: string, id: string) =>
    request<{ message: string }>(`/history/conversations/${id}`, { method: 'DELETE' }, token),

  // ストリーミング対応のメッセージ送信
  sendMessageStream: async (
    token: string,
    message: string,
    conversationId: string | null,
    filters: { maxCookingTime?: number } | undefined,
    onRecipe: (recipe: Recipe) => void,
    onResponse: (response: string) => void,
    onConversationId: (id: string) => void,
    onStatus?: (status: string) => void
  ) => {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        message, 
        conversationId, 
        filters,
        stream: true 
      }),
    })

    if (!response.ok) {
      throw new Error('メッセージの送信に失敗しました')
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('ストリーミングがサポートされていません')
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            
            if (data.type === 'conversationId') {
              onConversationId(data.data)
            } else if (data.type === 'recipe') {
              onRecipe(data.data)
            } else if (data.type === 'response') {
              onResponse(data.data)
            } else if (data.type === 'status') {
              if (onStatus) onStatus(data.data)
            } else if (data.type === 'error') {
              throw new Error(data.data)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  },
}
