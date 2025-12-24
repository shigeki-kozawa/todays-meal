import { useState, FormEvent, useRef, useEffect } from 'react'
import { Send, Mic, MicOff } from 'lucide-react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  isVoiceMode?: boolean
  shouldStartListening?: boolean
  onListeningStarted?: () => void
}

export default function ChatInput({ onSend, disabled = false, isVoiceMode = false, shouldStartListening = false, onListeningStarted }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { transcript, isListening, isSupported, error, startListening, stopListening, resetTranscript } = useSpeechRecognition()

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [message])

  useEffect(() => {
    if (transcript) {
      setMessage(transcript)
    }
  }, [transcript])

  useEffect(() => {
    if (isVoiceMode && shouldStartListening && !isListening && isSupported) {
      startListening()
      onListeningStarted?.()
    }
  }, [shouldStartListening, isVoiceMode])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage('')
      resetTranscript()
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const toggleVoiceInput = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  return (
    <div className="bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-3 md:py-4">
        {error && (
          <div className="mb-2 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2 md:gap-3 items-center">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isListening ? "聞いています..." : "食材や食べたいものを入力..."}
              className="w-full px-4 py-2.5 rounded-2xl border-2 border-gray-200 focus:border-primary-400 focus:ring-0 outline-none transition-all resize-none text-base leading-normal bg-gray-50 focus:bg-white"
              rows={1}
              disabled={disabled || isListening}
              style={{ minHeight: '48px', maxHeight: '120px' }}
              enterKeyHint="send"
            />
          </div>
          {(isSupported && !isVoiceMode) && (
            <button
              type="button"
              onClick={toggleVoiceInput}
              disabled={disabled}
              className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95'
              }`}
              aria-label={isListening ? "音声入力停止" : "音声入力開始"}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}
          {isVoiceMode && (
            <div className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center bg-accent-500 text-white">
              {isListening ? <Mic className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
            </div>
          )}
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
