import axios from 'axios';
import { getCookie } from './authAxiosInstance';

export const apiUrl = import.meta.env.VITE_API_URL;
//const apiUrl = 'http://172.20.10.4:5004/alumni/api/v1';

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
        config.headers.Authorization = token || '';
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


// axiosInstance.interceptors.response.use(
//     (response) => response,
//     async (error) => {
//         console.log('intercepting response');
//         if (error.response.status === 401) {
//             const currentPath = window.location.pathname + window.location.search;
//             window.location.href = `/login?from=${encodeURIComponent(currentPath)}`;
//         }
//         return Promise.reject(error);
//     }
// );

export default axiosInstance;
