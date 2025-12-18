import { useState, FormEvent, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [message])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  return (
    <div className="bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-3 md:py-4">
        <form onSubmit={handleSubmit} className="flex gap-2 md:gap-3 items-center">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="食材や食べたいものを入力..."
              className="w-full px-4 py-2.5 rounded-2xl border-2 border-gray-200 focus:border-primary-400 focus:ring-0 outline-none transition-all resize-none text-base leading-normal bg-gray-50 focus:bg-white"
              rows={1}
              disabled={disabled}
              style={{ minHeight: '48px', maxHeight: '120px' }}
              enterKeyHint="send"
            />
          </div>
          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-2xl flex items-center justify-center hover:shadow-md active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
            aria-label="送信"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  )
}
