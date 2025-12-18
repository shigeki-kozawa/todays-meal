import { Clock, Flame, Heart } from 'lucide-react'
import type { Recipe } from '../types'

interface RecipeCardProps {
  recipe: Recipe
  onClick?: () => void
  onFavorite?: () => void
  isFavorite?: boolean
  compact?: boolean
}

export default function RecipeCard({
  recipe,
  onClick,
  onFavorite,
  isFavorite = false,
  compact = false,
}: RecipeCardProps) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer active:scale-[0.98] transition-all duration-200 p-3 md:p-4 ${
        compact ? '' : 'md:p-5'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 md:gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm md:text-base lg:text-lg text-gray-900 mb-1.5 md:mb-2 line-clamp-2">
            {recipe.name}
          </h3>
          <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-600">
            <span className="flex items-center gap-1 md:gap-1.5">
              <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary-500" />
              <span className="font-medium">{recipe.cookingTime}分</span>
            </span>
            <span className="flex items-center gap-1 md:gap-1.5">
              <Flame className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-500" />
              <span className="font-medium">{recipe.calories}kcal</span>
            </span>
          </div>
          {!compact && (
            <div className="mt-2 md:mt-3 flex flex-wrap gap-1.5 md:gap-2 text-xs">
              <span className="inline-flex items-center bg-red-50 text-red-700 px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg font-medium">
                たんぱく質 {recipe.nutrition.protein}g
              </span>
              <span className="inline-flex items-center bg-yellow-50 text-yellow-700 px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg font-medium">
                脂質 {recipe.nutrition.fat}g
              </span>
              <span className="inline-flex items-center bg-blue-50 text-blue-700 px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg font-medium">
                炭水化物 {recipe.nutrition.carbs}g
              </span>
            </div>
          )}
        </div>
        {onFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onFavorite()
            }}
            className={`flex-shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
              isFavorite
                ? 'bg-red-100 text-red-500 hover:bg-red-200'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-red-400'
            }`}
            aria-label="お気に入り"
          >
            <Heart className={`w-4 h-4 md:w-5 md:h-5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>
    </div>
  )
}
