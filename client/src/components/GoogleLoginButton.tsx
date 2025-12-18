import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            auto_select?: boolean
          }) => void
          renderButton: (
            element: HTMLElement,
            config: {
              theme?: 'outline' | 'filled_blue' | 'filled_black'
              size?: 'large' | 'medium' | 'small'
              width?: number
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
              shape?: 'rectangular' | 'pill' | 'circle' | 'square'
              logo_alignment?: 'left' | 'center'
            }
          ) => void
          prompt: () => void
        }
      }
    }
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

interface GoogleLoginButtonProps {
  onError?: (error: string) => void
  onSuccess?: () => void
}

export default function GoogleLoginButton({ onError, onSuccess }: GoogleLoginButtonProps) {
  const { googleLogin } = useAuth()
  const buttonRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  const isConfigured = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'your_google_client_id_here'

  useEffect(() => {
    if (!isConfigured) return

    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
    
    if (existingScript) {
      setScriptLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => setScriptLoaded(true)
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [isConfigured])

  useEffect(() => {
    if (!scriptLoaded || !isConfigured || !buttonRef.current) return

    const handleCredentialResponse = async (response: { credential: string }) => {
      setIsLoading(true)
      try {
        await googleLogin(response.credential)
        onSuccess?.()
      } catch (error) {
        onError?.(error instanceof Error ? error.message : 'Googleログインに失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    window.google?.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    })

    window.google?.accounts.id.renderButton(buttonRef.current, {
      theme: 'outline',
      size: 'large',
      width: buttonRef.current.offsetWidth,
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'center',
    })
  }, [scriptLoaded, googleLogin, onError, onSuccess, isConfigured])

  if (!isConfigured) {
    return null
  }

  return (
    <div className="relative">
      <div 
        ref={buttonRef} 
        className={`w-full ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
        style={{ minHeight: '44px' }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-transparent" />
        </div>
      )}
    </div>
  )
}
