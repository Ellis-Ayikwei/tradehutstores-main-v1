import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import authAxiosInstance, { getCookie } from './authAxiosInstance';

export const apiUrl = import.meta.env.VITE_API_URL;

const axiosInstance = axios.create({
    baseURL: apiUrl,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

axiosInstance.interceptors.request.use(
    (config) => {
        const token = getCookie('_auth');
        config.headers.Authorization = token
            ? token.startsWith('Bearer ')
                ? token
                : `Bearer ${token}`
            : '';
        config.headers['X-Refresh-Token'] = getCookie('_auth_refresh') ?? '';

        if (!config.data) {
            config.data = {
                user_id: localStorage.getItem('userId') ?? 'default_user_id',
            };
        }

        return config;
    },
    (error) => Promise.reject(new Error(error.message))
);

// ── 401 → silent refresh + retry ─────────────────────────────────────────────
// react-auth-kit refreshes on a fixed interval (10 min). If a request slips
// out while the access token has expired but the interval hasn't fired yet,
// the BE returns 401 and — without recovery — the user appears "logged out"
// even though their refresh token is still valid for days. This interceptor
// transparently swaps in a fresh access token, retries the original request
// once, and only redirects to /login if the refresh itself fails.
let inFlightRefresh: Promise<string | null> | null = null;

// Must match the cookieDomain / cookieSecure passed to react-auth-kit's
// createStore in main.tsx — if any attribute differs the browser stores a
// SECOND _auth cookie and getCookie() races between the two values.
const cookieAttrs = (): string => {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    const domain = `; domain=${window.location.hostname}`;
    return `; path=/; SameSite=Lax${secure}${domain}`;
};

const performRefresh = async (): Promise<string | null> => {
    try {
        const response = await authAxiosInstance.post('/refresh_token/', null);
        const authHeader: string | undefined =
            response.headers?.authorization || response.headers?.Authorization;
        if (!authHeader) return null;

        // Mirror the cookie format used by login + the createRefresh callback
        // in main.tsx so subsequent requests through this interceptor see the
        // expected "Bearer <token>" shape regardless of which path topped it up.
        const tokenWithPrefix = authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`;

        const expires = new Date(Date.now() + 30 * 60 * 1000).toUTCString();
        document.cookie = `_auth=${encodeURIComponent(tokenWithPrefix)}; expires=${expires}${cookieAttrs()}`;

        return tokenWithPrefix;
    } catch {
        return null;
    }
};

const redirectToLogin = () => {
    if (window.location.pathname.startsWith('/login')) return;
    const from = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?from=${from}`;
};

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
        const status = error.response?.status;

        // Don't try to recover from anything other than auth failures, and
        // don't loop on the refresh endpoint itself.
        if (
            !original ||
            status !== 401 ||
            original._retry ||
            (typeof original.url === 'string' && original.url.includes('refresh_token'))
        ) {
            return Promise.reject(error);
        }

        original._retry = true;

        if (!inFlightRefresh) {
            inFlightRefresh = performRefresh().finally(() => {
                inFlightRefresh = null;
            });
        }

        const newToken = await inFlightRefresh;
        if (!newToken) {
            redirectToLogin();
            return Promise.reject(error);
        }

        original.headers = { ...(original.headers || {}), Authorization: newToken };
        return axiosInstance(original);
    }
);

export default axiosInstance;
