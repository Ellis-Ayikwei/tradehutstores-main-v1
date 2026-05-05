import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { isAxiosError } from 'axios'
import type { TokenPair } from '@/lib/authClient'
import authAxiosInstance from '@/lib/authAxiosInstance'
import { syncGuestWishlistToServer } from '@/store/wishListSlice'

// ─── Types (aligned with Stores-Admin-style auth slice) ─────────────────────

export interface OTPState {
    required: boolean
    challengeToken: string | null
    method: 'email' | 'sms' | null
    maskedRecipient: string | null
    userId: string | null
    expiresIn: number
    attemptsRemaining: number
    lockoutRemaining: number
    cooldownRemaining: number
}

export interface TrustedDevice {
    id: string
    device_name: string
    ip_address: string
    created_at: string
    last_used_at: string
    is_current: boolean
    is_valid: boolean
}

export interface AuthState {
    isLoggedIn: boolean
    loading: boolean
    user: Record<string, unknown> | null
    error: string | null
    message: string | null
    otp: OTPState
    trustedDevices: TrustedDevice[]
}

const initialOTPState: OTPState = {
    required: false,
    challengeToken: null,
    method: null,
    maskedRecipient: null,
    userId: null,
    expiresIn: 300,
    attemptsRemaining: 5,
    lockoutRemaining: 0,
    cooldownRemaining: 0,
}

export const initialAuthState: AuthState = {
    isLoggedIn: false,
    loading: false,
    user: null,
    error: null,
    message: null,
    otp: initialOTPState,
    trustedDevices: [],
}

const ERROR_MESSAGES = {
    DEFAULT: 'An error occurred',
    LOGIN_FAILED: 'Invalid email or password',
    REGISTER_FAILED: 'Registration failed. Please try again.',
    RESET_PASSWORD_FAILED: 'Failed to reset the password. Please try again.',
    FORGOT_PASSWORD_FAILED: 'Failed to request password reset. Please try again.',
    REFRESH_FAILED: 'Token refresh failed',
    LOGOUT_FAILED: 'Logout failed',
}

/** Mirrors `useSignIn()` — passed from components (hooks cannot run in thunks). */
export type AuthKitSignInFn = (config: {
    auth: { token: string; type?: string }
    refresh?: string
    userState: { id: string; email: string; name: string; uuid?: string }
}) => boolean

export type AuthKitSignOutFn = () => void

function axiosDetail(e: unknown): string {
    if (isAxiosError(e)) {
        const d = e.response?.data as { detail?: string; message?: string } | undefined
        if (d && typeof d === 'object') {
            if (typeof d.detail === 'string') return d.detail
            if (typeof d.message === 'string') return d.message
        }
        return e.message || ERROR_MESSAGES.DEFAULT
    }
    if (e instanceof Error) return e.message
    return ERROR_MESSAGES.DEFAULT
}

function headerString(
    headers: Record<string, string | undefined>,
    ...keys: string[]
): string | undefined {
    for (const k of keys) {
        const v = headers[k]
        if (typeof v === 'string' && v) return v
    }
    return undefined
}

function toAuthKitUserStateFromApiUser(u: Record<string, unknown>) {
    const email = String(u.email ?? '')
    const fn = typeof u.first_name === 'string' ? u.first_name : ''
    const ln = typeof u.last_name === 'string' ? u.last_name : ''
    const un = typeof u.username === 'string' ? u.username : ''
    const name = [fn, ln].filter(Boolean).join(' ') || un || email.split('@')[0] || 'User'
    return {
        id: String(u.id ?? ''),
        email,
        name,
    }
}

function readRefreshCookie(): string | undefined {
    if (typeof document === 'undefined') return undefined
    const parts = document.cookie.split(';')
    for (const p of parts) {
        const [k, ...rest] = p.trim().split('=')
        if (k === '_auth_refresh') return decodeURIComponent(rest.join('='))
    }
    return undefined
}

// ─── Thunks ─────────────────────────────────────────────────────────────────

/**
 * Modal / JWT flows: persist access + refresh + user via react-auth-kit, then sync wishlist.
 */
export const commitAuthKitSignIn = createAsyncThunk<
    { user: TokenPair['user'] },
    { pair: TokenPair; signIn: AuthKitSignInFn },
    { rejectValue: string }
>('auth/commitAuthKitSignIn', async ({ pair, signIn }, { dispatch, rejectWithValue }) => {
    try {
        const cleanAccess = pair.access.startsWith('Bearer ')
            ? pair.access
            : `Bearer ${pair.access}`
        const ok = signIn({
            auth: { token: cleanAccess, type: 'Bearer' },
            refresh: pair.refresh,
            userState: toAuthKitUserStateFromApiUser({
                id: pair.user.id,
                email: pair.user.email,
                username: pair.user.username,
                first_name: '',
                last_name: '',
            }),
        })
        if (ok === false) return rejectWithValue('Sign-in failed')
        void dispatch(syncGuestWishlistToServer())
        return { user: pair.user }
    } catch (e) {
        return rejectWithValue(e instanceof Error ? e.message : 'Sign-in failed')
    }
})

/** Legacy email/password login — `POST auth/login/` (tokens in headers). */
export const loginUser = createAsyncThunk<
    { user: Record<string, unknown>; otpRequired: false },
    { email: string; password: string; extra: { signIn: AuthKitSignInFn } },
    { rejectValue: string }
>('auth/loginUser', async ({ email, password, extra }, { dispatch, rejectWithValue }) => {
    try {
        const response = await authAxiosInstance.post('login/', { email, password })
        const data = response.data as { user?: Record<string, unknown> }
        const access = headerString(
            response.headers as Record<string, string | undefined>,
            'authorization',
            'Authorization',
        )
        const refresh = headerString(
            response.headers as Record<string, string | undefined>,
            'x-refresh-token',
            'X-Refresh-Token',
        )
        if (!data?.user || !access || !refresh) {
            return rejectWithValue('Invalid response from server')
        }
        const cleanAccess = access.startsWith('Bearer ') ? access : `Bearer ${access}`
        const ok = extra.signIn({
            auth: { token: cleanAccess, type: 'Bearer' },
            refresh,
            userState: toAuthKitUserStateFromApiUser(data.user),
        })
        if (ok === false) return rejectWithValue('Frontend sign-in failed')
        if (typeof data.user.id !== 'undefined') {
            localStorage.setItem('userId', String(data.user.id))
        }
        void dispatch(syncGuestWishlistToServer())
        return { user: data.user, otpRequired: false as const }
    } catch (e) {
        return rejectWithValue(axiosDetail(e) || ERROR_MESSAGES.LOGIN_FAILED)
    }
})

/** `POST auth/refresh_token/` — BE returns new access in `Authorization` only (no body user). */
export const refreshAuthToken = createAsyncThunk<
    { success: true },
    { signIn: AuthKitSignInFn },
    { rejectValue: string }
>('auth/refreshAuthToken', async ({ signIn }, { getState, rejectWithValue }) => {
    try {
        const response = await authAxiosInstance.post('refresh_token/')
        const access = headerString(
            response.headers as Record<string, string | undefined>,
            'authorization',
            'Authorization',
        )
        if (!access) return rejectWithValue(ERROR_MESSAGES.REFRESH_FAILED)
        const cleanAccess = access.startsWith('Bearer ') ? access : `Bearer ${access}`
        const refresh = readRefreshCookie()
        const u = (getState() as { auth: AuthState }).auth.user
        if (!u || typeof u.email !== 'string' || u.id == null) {
            return rejectWithValue('No user in session to refresh')
        }
        const ok = signIn({
            auth: { token: cleanAccess, type: 'Bearer' },
            ...(refresh ? { refresh } : {}),
            userState: toAuthKitUserStateFromApiUser(u as Record<string, unknown>),
        })
        if (ok === false) return rejectWithValue('Frontend token refresh failed')
        return { success: true as const }
    } catch (e) {
        return rejectWithValue(axiosDetail(e) || ERROR_MESSAGES.REFRESH_FAILED)
    }
})

export const logoutUser = createAsyncThunk<
    void,
    { signOut: AuthKitSignOutFn },
    { rejectValue: string }
>('auth/logoutUser', async ({ signOut }, { dispatch, rejectWithValue }) => {
    try {
        await authAxiosInstance.post('logout/')
        dispatch(resetAuth())
        signOut()
        localStorage.removeItem('userId')
        return undefined
    } catch (e) {
        return rejectWithValue(axiosDetail(e) || ERROR_MESSAGES.LOGOUT_FAILED)
    }
})

/** `POST auth/register/` — forwards payload; on OTP follow-up from BE, fills `otp` slice. */
export const registerUser = createAsyncThunk<
    Record<string, unknown>,
    Record<string, unknown>,
    { rejectValue: string }
>('auth/registerUser', async (payload, { rejectWithValue }) => {
    try {
        const { data } = await authAxiosInstance.post('register/', payload)
        return data as Record<string, unknown>
    } catch (e) {
        return rejectWithValue(axiosDetail(e) || ERROR_MESSAGES.REGISTER_FAILED)
    }
})

export const requestPasswordRecovery = createAsyncThunk<
    { detail?: string },
    { email: string },
    { rejectValue: string }
>('auth/requestPasswordRecovery', async ({ email }, { rejectWithValue }) => {
    try {
        const { data } = await authAxiosInstance.post('forget_password/', { email })
        return data as { detail?: string }
    } catch (e) {
        return rejectWithValue(axiosDetail(e) || ERROR_MESSAGES.FORGOT_PASSWORD_FAILED)
    }
})

export const confirmPasswordReset = createAsyncThunk<
    { detail?: string },
    { uidb64: string; token: string; password: string },
    { rejectValue: string }
>('auth/confirmPasswordReset', async ({ uidb64, token, password }, { rejectWithValue }) => {
    try {
        const { data } = await authAxiosInstance.post(`reset_password/${uidb64}/${token}/`, {
            password,
            uidb64,
            token,
        })
        return data as { detail?: string }
    } catch (e) {
        return rejectWithValue(axiosDetail(e) || ERROR_MESSAGES.RESET_PASSWORD_FAILED)
    }
})

// ─── Slice ───────────────────────────────────────────────────────────────────

const authSlice = createSlice({
    name: 'auth',
    initialState: initialAuthState,
    reducers: {
        resetAuth: (state) => {
            state.isLoggedIn = false
            state.user = null
            state.error = null
            state.message = null
            state.otp = { ...initialOTPState }
            state.trustedDevices = []
        },
        clearOTPState: (state) => {
            state.otp = { ...initialOTPState }
        },
        setOTPError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(commitAuthKitSignIn.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(commitAuthKitSignIn.fulfilled, (state, action) => {
                state.loading = false
                state.isLoggedIn = true
                state.user = action.payload.user as unknown as Record<string, unknown>
                state.error = null
                state.message = 'Signed in'
            })
            .addCase(commitAuthKitSignIn.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload ?? action.error.message ?? ERROR_MESSAGES.DEFAULT
            })
            .addCase(loginUser.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false
                state.user = action.payload.user
                state.isLoggedIn = true
                state.message = 'Login successful'
                state.otp = { ...initialOTPState }
                state.error = null
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload ?? ERROR_MESSAGES.LOGIN_FAILED
                state.message = null
            })
            .addCase(refreshAuthToken.pending, (state) => {
                state.loading = true
            })
            .addCase(refreshAuthToken.fulfilled, (state) => {
                state.loading = false
                state.message = 'Token refreshed successfully'
                state.error = null
            })
            .addCase(refreshAuthToken.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload ?? ERROR_MESSAGES.REFRESH_FAILED
                state.isLoggedIn = false
                state.user = null
            })
            .addCase(logoutUser.pending, (state) => {
                state.loading = true
            })
            .addCase(logoutUser.fulfilled, (state) => {
                state.user = null
                state.isLoggedIn = false
                state.loading = false
                state.message = 'Logged out successfully'
                state.otp = { ...initialOTPState }
                state.trustedDevices = []
                state.error = null
            })
            .addCase(logoutUser.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload ?? action.error.message ?? ERROR_MESSAGES.DEFAULT
            })
            .addCase(registerUser.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.loading = false
                const p = action.payload
                const otpSent = Boolean(p.otp_sent)
                const userId = p.user_id != null ? String(p.user_id) : null
                if (otpSent && userId) {
                    state.otp = {
                        required: true,
                        challengeToken: null,
                        method: 'email',
                        maskedRecipient: typeof p.email === 'string' ? p.email : null,
                        userId,
                        expiresIn: typeof p.validity_minutes === 'number' ? p.validity_minutes * 60 : 300,
                        attemptsRemaining: 5,
                        lockoutRemaining: 0,
                        cooldownRemaining: 0,
                    }
                    state.message =
                        typeof p.message === 'string' ? p.message : 'Check your email for a verification code'
                } else {
                    state.message =
                        typeof p.message === 'string' ? p.message : 'Registration submitted'
                    state.otp = { ...initialOTPState }
                }
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload ?? ERROR_MESSAGES.REGISTER_FAILED
                state.message = null
            })
            .addCase(requestPasswordRecovery.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(requestPasswordRecovery.fulfilled, (state, action) => {
                state.loading = false
                state.message = action.payload.detail ?? 'If an account exists, we sent reset instructions.'
            })
            .addCase(requestPasswordRecovery.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload ?? ERROR_MESSAGES.FORGOT_PASSWORD_FAILED
                state.message = null
            })
            .addCase(confirmPasswordReset.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(confirmPasswordReset.fulfilled, (state, action) => {
                state.loading = false
                state.message = action.payload.detail ?? 'Password updated'
            })
            .addCase(confirmPasswordReset.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload ?? ERROR_MESSAGES.RESET_PASSWORD_FAILED
                state.message = null
            })
    },
})

export const { resetAuth, clearOTPState, setOTPError } = authSlice.actions
export default authSlice.reducer
