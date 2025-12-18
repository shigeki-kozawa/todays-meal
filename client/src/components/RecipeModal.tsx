import { useEffect } from 'react'
import { X, Clock, Flame, Heart } from 'lucide-react'
import type { Recipe } from '../types'

interface RecipeModalProps {
  recipe: Recipe
  onClose: () => void
  onFavorite: () => void
  isFavorite: boolean
}

export default function RecipeModal({
  recipe,
  onClose,
  onFavorite,
  isFavorite,
}: RecipeModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden animate-slide-up sm:animate-bounce-in safe-bottom">
        <div className="bg-gradient-to-br from-primary-400 to-primary-600 p-4 sm:p-6 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-bold text-xl sm:text-2xl truncate">{recipe.name}</h2>
              <div className="flex items-center gap-4 mt-2 text-primary-100 text-sm sm:text-base">
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
              <button
                onClick={onFavorite}
                className={`btn-icon ${
                  isFavorite
                    ? 'bg-white/30 text-white'
                    : 'bg-white/20 text-white/90 active:bg-white/30'
                }`}
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="btn-icon bg-white/20 active:bg-white/30 text-white"
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
            <h3 className="font-display font-bold text-base sm:text-lg text-gray-800 mb-2 sm:mb-3">作り方</h3>
            <ol className="space-y-3 sm:space-y-4">
              {recipe.steps.map((step, index) => (
                <li key={index} className="flex gap-2 sm:gap-3">
                  <span className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm">
                    {index + 1}
                  </span>
                  <p className="text-gray-700 text-sm sm:text-base pt-0.5 flex-1">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
