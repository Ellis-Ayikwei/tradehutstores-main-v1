import axios from 'axios';

// const authApiUrl = 'https://127.0.0.1/sc/api/v1';
export const authApiUrl = 'http://127.0.0.1:8000/alumni/api/v1/auth';
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

authAxiosInstance.interceptors.request.use(
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

export default authAxiosInstance;
