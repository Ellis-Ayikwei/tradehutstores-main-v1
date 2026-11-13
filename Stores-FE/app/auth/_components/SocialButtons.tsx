'use client'

import { useState } from 'react'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import useSignIn from 'react-auth-kit/hooks/useSignIn'
import { useDispatch } from 'react-redux'
import { Loader2 } from 'lucide-react'
import type { AppDispatch } from '@/store'
import { socialLogin, type SocialProvider } from '@/store/authSlice'
import { ErrorBanner } from './fields'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''
const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ?? ''

// Meta forwards calls for a retired Graph version to the oldest live one, so an old value keeps working.
const FACEBOOK_SDK_VERSION = 'v21.0'

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string }) => void
            error_callback?: (error: { type: string }) => void
          }): { requestAccessToken(): void }
        }
      }
    }
    FB?: {
      init(config: { appId: string; version: string; cookie: boolean; xfbml: boolean }): void
      login(
        callback: (response: { authResponse?: { accessToken?: string } | null }) => void,
        options: { scope: string },
      ): void
    }
  }
}

/**
 * Where to send the buyer after signing in: the `next` query param when it is a path on this
 * site, otherwise the home page. Anything that could leave the site (`//host`, `/\host`,
 * absolute URLs) is ignored.
 */
export function nextPathAfterSignIn(): string {
  const next = new URLSearchParams(window.location.search).get('next') ?? ''
  return /^\/(?![/\\])/.test(next) ? next : '/'
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden>
      <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

const BUTTON_CLASS =
  'flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 text-base font-semibold text-zinc-800 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 disabled:cursor-not-allowed disabled:opacity-60'

/**
 * "Continue with Google / Facebook" plus the "or" divider under it. Shows only the providers
 * whose public id is configured, and renders nothing at all when none is.
 */
export default function SocialButtons({ dividerLabel }: { dividerLabel: string }) {
  const signIn = useSignIn()
  const dispatch = useDispatch<AppDispatch>()
  const router = useRouter()
  const [busy, setBusy] = useState<SocialProvider | null>(null)
  const [error, setError] = useState('')

  if (!GOOGLE_CLIENT_ID && !FACEBOOK_APP_ID) return null

  const finish = async (provider: SocialProvider, accessToken: string) => {
    try {
      await dispatch(socialLogin({ provider, accessToken, extra: { signIn } })).unwrap()
      router.push(nextPathAfterSignIn())
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Sign-in did not complete. Please try again.')
      setBusy(null)
    }
  }

  // Both SDKs open a popup, so each must be called directly from the click (no await before it).
  const startGoogle = () => {
    setError('')
    if (!window.google) return setError('Google sign-in is still loading. Try again in a moment.')
    setBusy('google')
    window.google.accounts.oauth2
      .initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        callback: (response) => {
          if (response.access_token) void finish('google', response.access_token)
          else setBusy(null)
        },
        error_callback: (err) => {
          setBusy(null)
          if (err.type === 'popup_failed_to_open') {
            setError('Your browser blocked the Google window. Allow pop-ups for this site and try again.')
          }
        },
      })
      .requestAccessToken()
  }

  const startFacebook = () => {
    setError('')
    if (!window.FB) return setError('Facebook sign-in is still loading. Try again in a moment.')
    setBusy('facebook')
    window.FB.login(
      (response) => {
        const token = response.authResponse?.accessToken
        if (token) void finish('facebook', token)
        else setBusy(null)
      },
      { scope: 'public_profile,email' },
    )
  }

  return (
    <div>
      {GOOGLE_CLIENT_ID && <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />}
      {FACEBOOK_APP_ID && (
        <Script
          src="https://connect.facebook.net/en_US/sdk.js"
          strategy="afterInteractive"
          onReady={() =>
            window.FB?.init({ appId: FACEBOOK_APP_ID, version: FACEBOOK_SDK_VERSION, cookie: false, xfbml: false })
          }
        />
      )}

      {error && (
        <div className="mb-4">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}

      <div className="space-y-3">
        {GOOGLE_CLIENT_ID && (
          <button type="button" onClick={startGoogle} disabled={busy !== null} className={BUTTON_CLASS}>
            {busy === 'google' ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <GoogleMark />}
            Continue with Google
          </button>
        )}
        {FACEBOOK_APP_ID && (
          <button type="button" onClick={startFacebook} disabled={busy !== null} className={BUTTON_CLASS}>
            {busy === 'facebook' ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <FacebookMark />}
            Continue with Facebook
          </button>
        )}
      </div>

      <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
        <span className="h-px flex-1 bg-zinc-200" />
        {dividerLabel}
        <span className="h-px flex-1 bg-zinc-200" />
      </div>
    </div>
  )
}
