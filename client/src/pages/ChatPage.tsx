import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import Layout from '../components/Layout'
import ChatMessage from '../components/ChatMessage'
import ChatInput from '../components/ChatInput'
import RecipeModal from '../components/RecipeModal'
import type { Message, Recipe } from '../types'
import { RefreshCw, Plus } from 'lucide-react'
import { sideDishRecipes } from '../data/sideDishRecipes'

const STORAGE_KEY = 'todays-meal-chat'

interface StoredChat {
  messages: Message[]
  conversationId: string | null
  timestamp: number
}

export default function ChatPage() {
  const { token } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (token && !isInitialized) {
      loadChatHistory()
      loadFavorites()
      setIsInitialized(true)
    }
  }, [token, isInitialized])

  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory()
    }
  }, [messages, conversationId])

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const saveChatHistory = () => {
    const chatData: StoredChat = {
      messages,
      conversationId,
      timestamp: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chatData))
  }

  const loadChatHistory = async () => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const chatData: StoredChat = JSON.parse(stored)
        const threeDaysInMs = 3 * 24 * 60 * 60 * 1000 // 3日間
        if (Date.now() - chatData.timestamp < threeDaysInMs && chatData.messages.length > 0) {
          setMessages(chatData.messages)
          setConversationId(chatData.conversationId)
          return
        }
      } catch (error) {
        console.error('Failed to load chat history:', error)
      }
    }
    await startNewChat()
  }

  const loadFavorites = async () => {
    if (!token) return
    try {
      const { favorites } = await api.getFavorites(token)
      setFavoriteIds(new Set(favorites.map((f) => f.id)))
    } catch (error) {
      console.error('Failed to load favorites:', error)
    }
  }

  const startNewChat = async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const result = await api.startChat(token)
      setConversationId(result.conversationId)
      const newMessages: Message[] = [
        {
          id: `msg_${Date.now()}`,
          role: 'assistant' as const,
          content: result.message,
          recipes: result.recipes,
        },
      ]
      setMessages(newMessages)
    } catch (error) {
      console.error('Failed to start chat:', error)
      const newMessages: Message[] = [
        {
          id: `msg_${Date.now()}`,
          role: 'assistant' as const,
          content: 'こんにちは！今日は何を食べたいですか？🍳',
        },
      ]
      setMessages(newMessages)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async (message: string) => {
    if (!token) return

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: message,
    }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    const assistantMessageId = `msg_${Date.now() + 1}`
    const recipes: Recipe[] = []
    let messageAdded = false

    try {
      await api.sendMessageStream(
        token,
        message,
        conversationId,
        undefined,
        // レシピが1つ届くたびに更新
        (recipe: Recipe) => {
          recipes.push(recipe)
          // レシピを既存のメッセージに追加
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, recipes: [...recipes] }
                : msg
            )
          )
        },
        // 応答テキストが届いたら最初にメッセージを追加
        (response: string) => {
          if (!messageAdded) {
            // 最初に応答が届いた時点でメッセージを追加（レシピはまだ空）
            messageAdded = true
            const assistantMessage: Message = {
              id: assistantMessageId,
              role: 'assistant',
              content: response,
              recipes: [],
            }
            setMessages((prev) => [...prev, assistantMessage])
          } else {
            // 既にメッセージがある場合は内容を更新（念のため）
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: response }
                  : msg
              )
            )
          }
        },
        // 会話IDを受信
        (id: string) => {
          setConversationId(id)
        },
        // ステータス更新は無視（不要）
        () => {
          // 何もしない
        }
      )
    } catch (error) {
      console.error('Failed to send message:', error)
      if (!messageAdded) {
        // エラー時にまだメッセージが追加されていない場合
        const errorMessage: Message = {
          id: assistantMessageId,
          role: 'assistant',
          content: 'すみません、エラーが発生しました。もう一度お試しください。',
        }
        setMessages((prev) => [...prev, errorMessage])
      } else {
        // エラー時に既にメッセージがある場合は更新
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: 'すみません、エラーが発生しました。もう一度お試しください。',
                }
              : msg
          )
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleFavorite = async (recipe: Recipe) => {
    if (!token || isFavoriteLoading) return
    setIsFavoriteLoading(true)
    try {
      if (favoriteIds.has(recipe.id)) {
        await api.removeFavorite(token, recipe.id)
        setFavoriteIds((prev) => {
          const next = new Set(prev)
          next.delete(recipe.id)
          return next
        })
      } else {
        await api.addFavorite(token, recipe.id)
        setFavoriteIds((prev) => new Set(prev).add(recipe.id))
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    } finally {
      setIsFavoriteLoading(false)
    }
  }

  const handleNewChat = () => {
    localStorage.removeItem(STORAGE_KEY)
    setMessages([])
    setConversationId(null)
    startNewChat()
  }

  const handleSideDishClick = (category: string, name: string) => {
    const recipe = sideDishRecipes[name]
    if (recipe) {
      // 付け合わせレシピとしてマーク
      const recipeWithImageAndFlag = { ...recipe, isSideDish: true }
      setSelectedRecipe(recipeWithImageAndFlag as any)
    }
  }

  const headerAction = (
    <button
      onClick={handleNewChat}
      disabled={isLoading}
      className="flex items-center justify-center gap-1.5 px-2.5 md:px-3 py-2 rounded-xl bg-primary-50 text-primary-700 hover:bg-primary-100 active:bg-primary-200 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed touch-target"
      title="新しい会話"
    >
      <Plus className="w-5 h-5" />
      <span className="text-sm font-medium hidden lg:inline">新しい会話</span>
    </button>
  )

  return (
    <Layout headerAction={headerAction}>
      <div className="flex flex-col flex-1 relative bg-gray-50">
        {/* スクロール可能なチャットエリア */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-6 py-4 pb-20"
        >
          <div className="max-w-3xl mx-auto space-y-4 md:space-y-5 mb-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onSelectRecipe={setSelectedRecipe}
                onFavorite={handleFavorite}
                favoriteIds={favoriteIds}
                onSideDishClick={handleSideDishClick}
              />
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-5 h-5 text-white animate-spin" />
                </div>
                <div className="bg-white shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 border border-gray-100">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-1" />
          </div>
        </div>

        {/* 画面下部固定の入力欄 */}
        <div className="fixed bottom-0 left-0 right-0 z-10">
          <ChatInput onSend={handleSend} disabled={isLoading} />
        </div>

        {selectedRecipe && (
          <RecipeModal
            recipe={selectedRecipe}
            onClose={() => setSelectedRecipe(null)}
            onFavorite={() => handleFavorite(selectedRecipe)}
            isFavorite={favoriteIds.has(selectedRecipe.id)}
            onSideDishClick={handleSideDishClick}
            isSideDish={(selectedRecipe as any).isSideDish}
          />
        )}
      </div>
    </Layout>
  )
}
