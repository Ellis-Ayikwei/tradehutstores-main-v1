/**
 * Stores-FE auth client.
 *
 * One typed wrapper around the new modal-flow endpoints
 * (`/tradehut/api/v1/auth/modal/...`). Designed to be the *only* place in
 * the app that knows the auth endpoint shapes — every component should go
 * through `useAuthModal()` or call these functions directly.
 *
 * The legacy `/auth/login`, `/auth/register` pages still work via the old
 * code path; this file intentionally does NOT touch them.
 */

import axiosInstance from './axiosInstance'
import authAxiosInstance from './authAxiosInstance'

// ─── Types ────────────────────────────────────────────────────────────────────

export type IdentifierKind = 'email' | 'phone'
export type AuthMethod = 'password' | 'otp'

export interface IdentifyResponse {
    flow_token: string
    identifier_kind: IdentifierKind
    masked: string
    exists: boolean
    methods: AuthMethod[]
}

export interface SendOTPResponse {
    sent: boolean
    expires_in_seconds: number
    resend_in_seconds: number
    attempts_remaining: number
}

export interface AuthUser {
    id: string
    email: string
    username?: string
    is_staff?: boolean
}

export interface TokenPair {
    access: string
    refresh: string
    user: AuthUser
}

export interface VerifyOTPSuccess extends Partial<TokenPair> {
    verified: true
    needs_account: boolean
    needs_password?: boolean
    flow_token?: string
}

export interface AuthError {
    detail: string
    attempts_remaining?: number
    retry_in_seconds?: number
}

// ─── Internal helper ──────────────────────────────────────────────────────────

const BASE = 'modal'

async function call<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const { data } = await authAxiosInstance.post<T>(`${BASE}/${path}/`, body)
    return data
}

// ─── Public surface ───────────────────────────────────────────────────────────

export const authApi = {
    identify: (identifier: string) =>
        call<IdentifyResponse>('identify', { identifier }),

    sendOtp: (flow_token: string) =>
        call<SendOTPResponse>('send-otp', { flow_token }),

    verifyOtp: (flow_token: string, code: string) =>
        call<VerifyOTPSuccess>('verify-otp', { flow_token, code }),

    loginPassword: (flow_token: string, password: string) =>
        call<TokenPair>('login-password', { flow_token, password }),

    setPassword: (flow_token: string, password: string) =>
        call<{ staged: true }>('set-password', { flow_token, password }),

    createAccount: (flow_token: string, fields: { name?: string; username?: string }) =>
        call<TokenPair>('create-account', { flow_token, ...fields }),

    refresh: (refresh: string) =>
        call<{ access: string }>('refresh', { refresh }),

    logout: (refresh?: string) =>
        call<{ ok: true }>('logout', refresh ? { refresh } : {}),
}
