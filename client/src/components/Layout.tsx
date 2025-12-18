import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { MessageCircle, Heart, Clock, LogOut, ChefHat } from 'lucide-react'

interface LayoutProps {
  children: ReactNode
  headerAction?: ReactNode
}

export default function Layout({ children, headerAction }: LayoutProps) {
  const { user, logout } = useAuth()
  const location = useLocation()

  const navItems = [
    { path: '/', icon: MessageCircle, label: 'チャット' },
    { path: '/favorites', icon: Heart, label: 'お気に入り' },
    { path: '/history', icon: Clock, label: '履歴' },
  ]

  return (
    <div className="min-h-screen min-h-[-webkit-fill-available] flex flex-col">
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-3 md:px-4 py-2 md:py-2.5 flex items-center justify-between">
          {/* 左：ブランド */}
          <Link to="/" className="flex items-center gap-2 group touch-target flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-sm">
              <ChefHat className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <span className="font-display font-bold text-lg md:text-xl text-gray-800 hidden md:inline">今日のご飯</span>
          </Link>
          
          {/* 右：ナビゲーション + アクション */}
          <div className="flex items-center gap-1">
            {/* ページ固有のアクション（チャットページのみ） */}
            {headerAction && location.pathname === '/' && (
              <div className="mr-1 md:mr-2">{headerAction}</div>
            )}
            
            {/* グローバルナビゲーション */}
            <nav className="flex items-center gap-1">
              {navItems.map(({ path, icon: Icon, label }) => {
                // チャットページではチャットアイコンを非表示
                const isCurrentPage = location.pathname === path
                const isChatPage = path === '/' && location.pathname === '/'
                
                if (isChatPage) return null
                
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center justify-center gap-1.5 px-2.5 md:px-3 py-2 rounded-xl transition-all duration-150 touch-target ${
                      isCurrentPage
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
                    }`}
                    title={label}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="hidden lg:inline text-sm font-medium">{label}</span>
                  </Link>
                )
              })}
            </nav>
            
            {/* ユーザーメニュー */}
            <div className="flex items-center gap-2 ml-1 md:ml-2 pl-1 md:pl-2 border-l border-gray-200">
              <span className="text-xs text-gray-600 hidden lg:inline truncate max-w-24">
                {user?.name}
              </span>
              <button
                onClick={logout}
                className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                title="ログアウト"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  )
}
