import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import type { Conversation } from '../types'
import { Clock, MessageCircle, Trash2, ChevronRight } from 'lucide-react'

export default function HistoryPage() {
  const { token } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      loadHistory()
    }
  }, [token])

  const loadHistory = async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const { conversations } = await api.getHistory(token)
      setConversations(conversations)
    } catch (error) {
      console.error('Failed to load history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!token) return
    if (!confirm('この会話を削除しますか？')) return

    setDeletingId(id)
    try {
      await api.deleteConversation(token, id)
      setConversations((prev) => prev.filter((c) => c.id !== id))
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return '今日'
    } else if (days === 1) {
      return '昨日'
    } else if (days < 7) {
      return `${days}日前`
    } else {
      return date.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-1">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain">
      <div className="max-w-4xl mx-auto p-3 sm:p-4 safe-bottom">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-gray-800">履歴</h1>
            <p className="text-gray-600 text-xs sm:text-sm">{conversations.length}件の会話</p>
          </div>
        </div>
        {conversations.length === 0 ? (
          <div className="card p-8 sm:p-12 text-center">
            <MessageCircle className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <h2 className="font-display text-lg sm:text-xl text-gray-600 mb-2">履歴はまだありません</h2>
            <p className="text-gray-500 text-sm sm:text-base">
              チャットで会話を始めると、ここに履歴が表示されます
            </p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`card p-3 sm:p-4 active:scale-[0.99] transition-all duration-150 ${
                  deletingId === conversation.id ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm sm:text-base text-gray-800 truncate">
                        {conversation.title || '無題の会話'}
                      </h3>
                      <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-500">
                        <span>{formatDate(conversation.updated_at)}</span>
                        {conversation.message_count && (
                          <span className="hidden xs:inline">{conversation.message_count}件</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(conversation.id)}
                      disabled={deletingId === conversation.id}
                      className="btn-icon text-gray-400 active:text-red-500 active:bg-red-50"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
