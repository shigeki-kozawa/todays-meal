import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import RecipeCard from '../components/RecipeCard'
import RecipeModal from '../components/RecipeModal'
import type { Recipe } from '../types'
import { Heart, ArrowUpDown } from 'lucide-react'
import { sideDishRecipes } from '../data/sideDishRecipes'

type SortKey = 'name' | 'cookingTime' | 'calories'

export default function FavoritesPage() {
  const { token } = useAuth()
  const [favorites, setFavorites] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    if (token) {
      loadFavorites()
    }
  }, [token])

  const loadFavorites = async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const { favorites } = await api.getFavorites(token)
      setFavorites(favorites)
    } catch (error) {
      console.error('Failed to load favorites:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveFavorite = async (recipe: Recipe) => {
    if (!token) return
    try {
      await api.removeFavorite(token, recipe.id)
      setFavorites((prev) => prev.filter((f) => f.id !== recipe.id))
      if (selectedRecipe?.id === recipe.id) {
        setSelectedRecipe(null)
      }
    } catch (error) {
      console.error('Failed to remove favorite:', error)
    }
  }

  const handleSideDishClick = (_category: string, name: string) => {
    const recipe = sideDishRecipes[name]
    if (recipe) {
      setSelectedRecipe(recipe)
    }
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const sortedFavorites = [...favorites].sort((a, b) => {
    let comparison = 0
    switch (sortKey) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'cookingTime':
        comparison = a.cookingTime - b.cookingTime
        break
      case 'calories':
        comparison = a.calories - b.calories
        break
    }
    return sortOrder === 'asc' ? comparison : -comparison
  })

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl sm:text-2xl text-gray-800">お気に入り</h1>
              <p className="text-gray-600 text-xs sm:text-sm">{favorites.length}件のレシピ</p>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <span className="text-xs sm:text-sm text-gray-500 flex-shrink-0">並び替え:</span>
            <div className="flex gap-1">
              {[
                { key: 'name' as SortKey, label: '名前' },
                { key: 'cookingTime' as SortKey, label: '時間' },
                { key: 'calories' as SortKey, label: 'kcal' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleSort(key)}
                  className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 flex-shrink-0 touch-target ${
                    sortKey === key
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                  }`}
                >
                  {label}
                  {sortKey === key && (
                    <ArrowUpDown className={`w-3 h-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        {favorites.length === 0 ? (
          <div className="card p-8 sm:p-12 text-center">
            <Heart className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <h2 className="font-display text-lg sm:text-xl text-gray-600 mb-2">お気に入りはまだありません</h2>
            <p className="text-gray-500 text-sm sm:text-base">
              気に入ったレシピをハートマークで保存しましょう
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            {sortedFavorites.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => setSelectedRecipe(recipe)}
                onFavorite={() => handleRemoveFavorite(recipe)}
                isFavorite
              />
            ))}
          </div>
        )}
        {selectedRecipe && (
          <RecipeModal
            recipe={selectedRecipe}
            onClose={() => setSelectedRecipe(null)}
            onFavorite={() => handleRemoveFavorite(selectedRecipe)}
            isFavorite
            onSideDishClick={handleSideDishClick}
          />
        )}
      </div>
    </div>
  )
}
