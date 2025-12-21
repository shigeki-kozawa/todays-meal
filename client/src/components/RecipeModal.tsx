import { useEffect, useState } from 'react'
import { X, Clock, Flame, Heart, Volume2, VolumeX, ChefHat } from 'lucide-react'
import type { Recipe } from '../types'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'

interface RecipeModalProps {
  recipe: Recipe
  onClose: () => void
  onFavorite?: () => void
  isFavorite?: boolean
  onSideDishClick?: (category: string, name: string) => void
  isSideDish?: boolean
}

const getRecipeGradient = (name: string) => {
  const gradients = [
    'from-orange-400 to-red-500',
    'from-green-400 to-teal-500',
    'from-blue-400 to-indigo-500',
    'from-purple-400 to-pink-500',
    'from-yellow-400 to-orange-500',
    'from-red-400 to-pink-500',
  ]
  const index = name.length % gradients.length
  return gradients[index]
}

const getRecipeEmoji = (name: string) => {
  if (name.includes('肉') || name.includes('豚') || name.includes('牛')) return '🥩'
  if (name.includes('鶏') || name.includes('チキン')) return '🍗'
  if (name.includes('魚') || name.includes('サーモン') || name.includes('鮭')) return '🐟'
  if (name.includes('野菜') || name.includes('サラダ')) return '🥗'
  if (name.includes('パスタ') || name.includes('スパゲティ')) return '🍝'
  if (name.includes('カレー')) return '🍛'
  if (name.includes('ご飯') || name.includes('丼')) return '🍚'
  if (name.includes('麺') || name.includes('ラーメン') || name.includes('うどん')) return '🍜'
  return '🍳'
}

export default function RecipeModal({
  recipe,
  onClose,
  onFavorite,
  isFavorite = false,
  onSideDishClick,
  isSideDish = false,
}: RecipeModalProps) {
  const { speak, cancel, isSpeaking, isSupported } = useSpeechSynthesis()
  const [currentReadingStep, setCurrentReadingStep] = useState<number | null>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      cancel()
    }
  }, [cancel])

  const readStep = (step: string, index: number) => {
    if (currentReadingStep === index && isSpeaking) {
      cancel()
      setCurrentReadingStep(null)
    } else {
      setCurrentReadingStep(index)
      speak(`手順${index + 1}。${step}`)
    }
  }

  const readAllSteps = () => {
    if (isSpeaking) {
      cancel()
      setCurrentReadingStep(null)
    } else {
      const allStepsText = recipe.steps
        .map((step, index) => `手順${index + 1}。${step}`)
        .join('。次に、')
      speak(`${recipe.name}の作り方を読み上げます。${allStepsText}`)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden animate-slide-up sm:animate-bounce-in safe-bottom">
        {recipe.imageUrl ? (
          <div className="w-full h-48 sm:h-56 overflow-hidden">
            <img
              src={recipe.imageUrl}
              alt={recipe.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className={`w-full h-48 sm:h-56 bg-gradient-to-br ${getRecipeGradient(recipe.name)} flex items-center justify-center`}>
            <span className="text-8xl sm:text-9xl" role="img" aria-label="料理">
              {getRecipeEmoji(recipe.name)}
            </span>
          </div>
        )}
        <div className={`${recipe.imageUrl ? 'bg-white' : 'bg-white'} p-4 sm:p-6 ${recipe.imageUrl ? 'text-gray-900' : 'text-gray-900'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-bold text-xl sm:text-2xl truncate">{recipe.name}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm sm:text-base text-gray-600">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {recipe.cookingTime}分
                </span>
                <span className="flex items-center gap-1">
                  <Flame className="w-4 h-4" />
                  {recipe.calories}kcal
                </span>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {!isSideDish && onFavorite && (
                <button
                  onClick={onFavorite}
                  className={`btn-icon ${
                    isFavorite
                      ? 'bg-red-100 text-red-500'
                      : 'bg-gray-100 text-gray-400 active:bg-gray-200'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
              )}
              <button
                onClick={onClose}
                className="btn-icon bg-gray-100 text-gray-700 active:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh] overscroll-contain">
          <div className="flex gap-2 sm:gap-3 mb-5 sm:mb-6">
            <div className="flex-1 bg-red-50 rounded-xl p-2.5 sm:p-3 text-center">
              <div className="text-xl sm:text-2xl font-bold text-red-600">{recipe.nutrition.protein}g</div>
              <div className="text-[10px] sm:text-xs text-red-500">タンパク質</div>
            </div>
            <div className="flex-1 bg-yellow-50 rounded-xl p-2.5 sm:p-3 text-center">
              <div className="text-xl sm:text-2xl font-bold text-yellow-600">{recipe.nutrition.fat}g</div>
              <div className="text-[10px] sm:text-xs text-yellow-500">脂質</div>
            </div>
            <div className="flex-1 bg-blue-50 rounded-xl p-2.5 sm:p-3 text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{recipe.nutrition.carbs}g</div>
              <div className="text-[10px] sm:text-xs text-blue-500">炭水化物</div>
            </div>
          </div>
          <div className="mb-5 sm:mb-6">
            <h3 className="font-display font-bold text-base sm:text-lg text-gray-800 mb-2 sm:mb-3">材料</h3>
            <ul className="space-y-1.5 sm:space-y-2">
              {recipe.ingredients.map((ing, index) => (
                <li
                  key={index}
                  className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 text-sm sm:text-base"
                >
                  <span className="text-gray-700">{ing.name}</span>
                  <span className="text-gray-500 text-sm">{ing.amount}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h3 className="font-display font-bold text-base sm:text-lg text-gray-800">作り方</h3>
              {isSupported && (
                <button
                  onClick={readAllSteps}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isSpeaking
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
                  }`}
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="w-4 h-4" />
                      <span className="hidden sm:inline">停止</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" />
                      <span className="hidden sm:inline">全て読み上げ</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <ol className="space-y-3 sm:space-y-4">
              {recipe.steps.map((step, index) => (
                <li key={index} className="flex gap-2 sm:gap-3 group">
                  <span className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700 text-sm sm:text-base pt-0.5">{step}</p>
                  </div>
                  {isSupported && (
                    <button
                      onClick={() => readStep(step, index)}
                      className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 touch-target ${
                        currentReadingStep === index && isSpeaking
                          ? 'bg-red-100 text-red-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-primary-100 hover:text-primary-600'
                      }`}
                      aria-label={`手順${index + 1}を読み上げ`}
                    >
                      {currentReadingStep === index && isSpeaking ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </div>
          {recipe.sideDishes && recipe.sideDishes.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <ChefHat className="w-5 h-5 text-primary-600" />
                <h3 className="font-display font-semibold text-lg text-gray-900">
                  おすすめの付け合わせ
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recipe.sideDishes.map((sideDish, index) => (
                  <button
                    key={index}
                    onClick={() => onSideDishClick?.(sideDish.category, sideDish.name)}
                    className="flex items-start gap-3 p-4 bg-gradient-to-br from-primary-50 to-accent-50 rounded-xl hover:shadow-md transition-all duration-200 text-left group overflow-hidden"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
                      <img
                        src={`/images/recipe-categories/${sideDish.category}.png`}
                        alt={sideDish.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 mb-1">{sideDish.name}</p>
                      <p className="text-xs text-gray-600">{sideDish.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {recipe.imageUrl && recipe.sourceName && recipe.sourceUrl && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                参照元: <a 
                  href={recipe.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 underline"
                >
                  {recipe.sourceName}
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
