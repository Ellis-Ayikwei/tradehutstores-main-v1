import axios from 'axios';
import authAxiosInstance from './authAxiosInstance';
import { getCookie } from './authAxiosInstance';

export const apiUrl = 'http://127.0.0.1:8000/api/v1';
//const apiUrl = 'http://172.20.10.4:5004/alumni/api/v1';

const axiosInstance = axios.create({
    baseURL: apiUrl,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Helper to get auth token from react-auth-kit cookie
// react-auth-kit stores token in cookie with name '_auth' (matching authName in AuthProvider)
const getAuthToken = (): string => {
    if (typeof document === 'undefined') return '';
    const token = getCookie('_auth');
    // react-auth-kit may store token with or without 'Bearer ' prefix
    // Return as-is, axios will handle the format
    return token || '';
};

// Helper to set cookie (for token refresh in interceptor)
const setCookie = (name: string, value: string, days: number = 7): void => {
    if (typeof document === 'undefined') return;
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax${window.location.protocol === 'https:' ? ';Secure' : ''}`;
};

export const refreshTokens = async (): Promise<{ accessToken: string; refreshToken: string }> => {
    try {
        const response = await authAxiosInstance.post('/refresh_token');
        const accessToken = response.headers['authorization']?.split(' ')[1];
        const refreshToken = response.headers['x-refresh-token'];
        return {
            accessToken: accessToken || '',
            refreshToken: refreshToken || '',
        };
    } catch (err) {
        throw new Error('Token refresh failed');
    }
};

axiosInstance.interceptors.request.use(
    (config) => {
        const token = getAuthToken();
        // Ensure token is properly formatted for Authorization header
        if (token && !token.startsWith('Bearer ')) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            config.headers.Authorization = token || '';
        }
        config.headers['X-Refresh-Token'] = getCookie('_auth_refresh') ?? '';

        if (!config.data) {
            config.data = {
                user_id: localStorage.getItem('userId') ?? 'default_user_id',
            };
        }

        return config;
    },
    (error) => {
        return Promise.reject(new Error(error.message));
    }
);

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401 && !error.config._retry) {
            error.config._retry = true;
            try {
                console.log('refreshing token');
                const { accessToken, refreshToken } = await refreshTokens();
                
                if (accessToken) {
                    // Set cookies directly - react-auth-kit uses cookies, so this will sync
                    // The cookie name '_auth' matches the authName in AuthProvider
                    setCookie('_auth', `Bearer ${accessToken}`, 7);
                    if (refreshToken) {
                        setCookie('_auth_refresh', refreshToken, 30);
                    }
                }

                // Retry the original request
                error.config.headers['Authorization'] = `Bearer ${accessToken}`;
                const retryResponse = await authAxiosInstance.request(error.config);
                return retryResponse;
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                if (typeof window !== 'undefined') {
                    window.location.href = '/auth/login';
                }
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
