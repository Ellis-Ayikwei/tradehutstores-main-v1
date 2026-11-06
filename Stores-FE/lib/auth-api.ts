/**
 * Thin client for the legacy email/password auth endpoints in
 * Stores-BE/apps/authentication/views.py (mounted at `${apiUrl}auth/`).
 *
 * Used by app/auth/register, app/auth/forgot-password and
 * app/auth/reset-password. Login stays on react-auth-kit and is not touched.
 *
 * Request/response shapes mirror the backend exactly; see the file:line notes
 * on each function.
 */

import { isAxiosError } from 'axios'
import authAxiosInstance from './authAxiosInstance'

// --- Error normalisation -----------------------------------------------------

export interface AuthApiError {
  /** HTTP status, or 0 when the server could not be reached. */
  status: number
  /** Backend `error_code` when present (e.g. EMAIL_ALREADY_EXISTS). */
  code?: string
  /** Human-readable summary, safe to show in a banner. */
  message: string
  /** First message per backend field name (email, password, phone_number, ...). */
  fields: Record<string, string>
}

const GENERIC_ERROR = 'Something went wrong. Please try again.'
const NETWORK_ERROR = 'We could not reach the server. Check your connection and try again.'
const RATE_LIMIT_ERROR = 'Too many attempts. Please wait a minute and try again.'

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function firstMessage(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (Array.isArray(v)) {
    for (const item of v) {
      const m = firstMessage(item)
      if (m) return m
    }
    return undefined
  }
  if (isRecord(v)) {
    for (const key of Object.keys(v)) {
      const m = firstMessage(v[key])
      if (m) return m
    }
  }
  return undefined
}

/**
 * Handles every error shape the auth views emit:
 *  - RegisterAPIView 400/409: { message, error_code, errors: { field: [msg] } }  (views.py:117-144, 236-243)
 *  - OTP / reset views:       { message, error_code } or { detail }              (views.py:926-931, 622-624)
 *  - raw DRF serializer:      { field: [msg] }                                    (views.py:608, 914)
 *  - non-JSON (HTML 500) and network failures
 */
export function parseAuthError(err: unknown): AuthApiError {
  if (!isAxiosError(err)) return { status: 0, message: GENERIC_ERROR, fields: {} }

  const status = err.response?.status ?? 0
  if (!err.response) return { status, message: NETWORK_ERROR, fields: {} }

  const data: unknown = err.response.data
  if (!isRecord(data)) {
    return { status, message: status === 429 ? RATE_LIMIT_ERROR : GENERIC_ERROR, fields: {} }
  }

  const fields: Record<string, string> = {}
  const source = isRecord(data.errors) ? data.errors : data
  for (const key of Object.keys(source)) {
    if (['message', 'detail', 'error_code', 'success'].includes(key)) continue
    const m = firstMessage(source[key])
    if (m) fields[key] = m
  }

  const message =
    (typeof data.message === 'string' && data.message) ||
    (typeof data.detail === 'string' && data.detail) ||
    fields.non_field_errors ||
    Object.values(fields)[0] ||
    GENERIC_ERROR

  return {
    status,
    code: typeof data.error_code === 'string' ? data.error_code : undefined,
    message: status >= 500 ? GENERIC_ERROR : message,
    fields,
  }
}

// --- Register ----------------------------------------------------------------

export interface RegisterPayload {
  email: string
  password: string
  password2: string
  first_name: string
  last_name: string
  /** Optional on the backend; validated as a UK number (serializer.py:179-199). */
  phone_number?: string
}

export interface RegisterResult {
  userId: string
  /** False when the account was created but the verification email failed. */
  otpSent: boolean
  maskedEmail?: string
  validityMinutes?: number
  errorCode?: string
}

/**
 * POST auth/register/  (urls.py:41, RegisterAPIView views.py:94-275,
 * RegisterSerializer serializer.py:39-255).
 *
 * 201 -> user created INACTIVE and a 6-digit signup OTP emailed (views.py:160-173).
 *        { success, message, email (masked), user_id, otp_sent, validity_minutes }
 *        or, if the email failed, { message, user_id, otp_sent: false, error_code } (views.py:174-211).
 * No tokens are returned: the user is not logged in after registering.
 */
export async function registerUser(payload: RegisterPayload): Promise<RegisterResult> {
  const { data } = await authAxiosInstance.post<Record<string, unknown>>('register/', payload)
  return {
    userId: String(data.user_id ?? ''),
    otpSent: data.otp_sent === true,
    maskedEmail: typeof data.email === 'string' ? data.email : undefined,
    validityMinutes: typeof data.validity_minutes === 'number' ? data.validity_minutes : undefined,
    errorCode: typeof data.error_code === 'string' ? data.error_code : undefined,
  }
}

/**
 * POST auth/otp/verify/  (urls.py:63, VerifyOTPView views.py:986-1152,
 * VerifyOTPSerializer serializer.py:279-292).
 * Body { email, otp_code (exactly 6 chars), otp_type: 'signup' }.
 * 200 -> activates the account, { message, action, user_id } (views.py:1047-1063).
 * 400 -> { message, error_code } for a wrong/expired code (views.py:1136-1142).
 */
export async function verifySignupOtp(email: string, otpCode: string): Promise<void> {
  await authAxiosInstance.post('otp/verify/', { email, otp_code: otpCode, otp_type: 'signup' })
}

/**
 * POST auth/otp/resend/  (urls.py:64, ResendOTPView views.py:1155-1267).
 * Body { email, otp_type: 'signup' }. 200 -> { message, masked_email, validity_minutes, otp_type }.
 * 429 COOLDOWN_ACTIVE (60s) / RATE_LIMIT_EXCEEDED (5 per hour) / 503 on email failure.
 */
export async function resendSignupOtp(email: string): Promise<void> {
  await authAxiosInstance.post('otp/resend/', { email, otp_type: 'signup' })
}

// --- Password reset (link based) ---------------------------------------------

/**
 * POST auth/forget_password/  (urls.py:50, PasswordRecoveryAPIView views.py:521-571).
 * Body { email }. 200 -> { detail } and the response is the same whether or not the
 * account exists (views.py:533-540). The backend emails a LINK, not a code (views.py:547-559).
 * 400 { detail: 'Email is required.' }; 500 { detail } if the email could not be sent.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  await authAxiosInstance.post('forget_password/', { email })
}

/**
 * POST auth/reset_password/<uidb64>/<token>/  (urls.py:51-55,
 * PasswordResetConfirmAPIView views.py:574-637, PasswordResetConfirmSerializer serializer.py:564-569).
 * The serializer ALSO requires uidb64 and token in the body and uses the body values
 * rather than the URL ones, so both are sent. 200 -> { detail }.
 * 400 -> { password: [msgs] } (validate_password) or { detail: 'Invalid token.' }.
 */
export async function confirmPasswordReset(uid: string, token: string, password: string): Promise<void> {
  await authAxiosInstance.post(`reset_password/${encodeURIComponent(uid)}/${encodeURIComponent(token)}/`, {
    password,
    uidb64: uid,
    token,
  })
}
