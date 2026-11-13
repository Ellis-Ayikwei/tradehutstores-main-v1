import axios from 'axios';
import { apiUrl } from './config';
import { getDeviceIdentity } from './deviceIdentity';

// const authApiUrl = 'https://127.0.0.1/sc/api/v1';
export const authApiUrl = `${apiUrl}auth/`;
//const authApiUrl = 'http://172.20.10.4:5004/alumni/api/v1/auth';

export const getCookie = (name: string): string | undefined => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        const cookieValue = parts.pop()?.split(';').shift();
        return cookieValue ? decodeURIComponent(cookieValue) : undefined;
    }
    return undefined;
};


const authAxiosInstance = axios.create({
    baseURL: authApiUrl,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Helper to get auth token from react-auth-kit cookie
const getAuthToken = (): string => {
    if (typeof document === 'undefined') return '';
    const token = getCookie('_auth');
    return token || '';
};

// Requests that end in a signed-in session. Each carries the device identity so the backend can
// tie the session to a device.
const SIGN_IN_PATHS = /^(login\/|social\/|otp\/verify\/|modal\/(verify-otp|login-password|create-account)\/)$/;

authAxiosInstance.interceptors.request.use(
    async (config) => {
        const token = getAuthToken();
        // Ensure token is properly formatted for Authorization header
        if (token && !token.startsWith('Bearer ')) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            config.headers.Authorization = token || '';
        }
        config.headers['X-Refresh-Token'] = getCookie('_auth_refresh') ?? '';

        const body = config.data;
        if (SIGN_IN_PATHS.test(config.url ?? '') && body && typeof body === 'object' && !(body instanceof FormData)) {
            const device = await getDeviceIdentity();
            if (device) config.data = { ...body, ...device };
        }

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

export default authAxiosInstance;
