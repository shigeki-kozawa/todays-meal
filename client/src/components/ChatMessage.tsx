import { Bot, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message, Recipe } from '../types'
import RecipeCard from './RecipeCard'

interface ChatMessageProps {
  message: Message
  onSelectRecipe: (recipe: Recipe) => void
  onFavorite: (recipe: Recipe) => void
  favoriteIds: Set<string>
}

export default function ChatMessage({
  message,
  onSelectRecipe,
  onFavorite,
  favoriteIds,
}: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-2 md:gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shadow-sm ${
          isUser
            ? 'bg-gradient-to-br from-accent-400 to-accent-600'
            : 'bg-gradient-to-br from-primary-400 to-primary-600'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
        ) : (
          <Bot className="w-4 h-4 md:w-5 md:h-5 text-white" />
        )}
      </div>
      <div className={`flex-1 min-w-0 max-w-[85%] md:max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block px-3 py-2.5 md:px-4 md:py-3 rounded-2xl text-sm md:text-base ${
            isUser
              ? 'bg-accent-500 text-white rounded-tr-sm shadow-sm'
              : 'bg-white shadow-sm rounded-tl-sm border border-gray-100'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
          ) : (
            <div className="markdown-content text-gray-800 leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
                  li: ({ children }) => <li className="ml-2">{children}</li>,
                  h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                  code: ({ children }) => (
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">
                      {children}
                    </code>
                  ),
                  a: ({ href, children }) => (
                    <a href={href} className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        {message.recipes && message.recipes.length > 0 && (
          <div className="mt-2 md:mt-3 space-y-2 md:space-y-3">
            {message.recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => onSelectRecipe(recipe)}
                onFavorite={() => onFavorite(recipe)}
                isFavorite={favoriteIds.has(recipe.id)}
                compact
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
