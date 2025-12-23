import axios from 'axios';

// const authApiUrl = 'https://127.0.0.1/sc/api/v1';
export const authApiUrl = import.meta.env.VITE_API_URL + 'auth';

//export const authApiUrl = 'http://127.0.0.1:5004/alumni/api/v1/auth';
//const authApiUrl = 'http://172.20.10.4:5004/alumni/api/v1/auth';

export const getCookie = (name: string): string | undefined => {
    try {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            const cookieValue = parts.pop()?.split(';').shift();
            return cookieValue ? decodeURIComponent(cookieValue) : undefined;
        }
        return undefined;
    } catch (error) {
        console.error(`Error getting cookie ${name}:`, error);
        return undefined;
    }
};

// Function to ensure cookies are properly set before trying to access them
// export const waitForCookie = async (name: string, maxWaitTime = 2000, checkInterval = 100): Promise<string | undefined> => {
//     return new Promise((resolve) => {
//         const startTime = Date.now();
        
//         const checkCookie = () => {
//             const cookie = getCookie(name);
//             if (cookie) {
//                 resolve(cookie);
//                 return;
//             }
            
//             const elapsed = Date.now() - startTime;
//             if (elapsed >= maxWaitTime) {
//                 console.warn(`Timeout waiting for cookie: ${name}`);
//                 resolve(undefined);
//                 return;
//             }
            
//             setTimeout(checkCookie, checkInterval);
//         };
        
//         checkCookie();
//     });
// };

const authAxiosInstance = axios.create({
    baseURL: authApiUrl,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Enhanced interceptor with better error handling
authAxiosInstance.interceptors.request.use(
    (config) => {
        try {
            const token = getCookie('_auth');
            const refreshToken = getCookie('_auth_refresh');

            console.log('Axios interceptor - cookies found:', { token: !!token, refreshToken: !!refreshToken });

            if (token) {
                // React-auth-kit stores the token, ensure it has Bearer prefix for Authorization header
                // The cookie might already have "Bearer " or just the token
                const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
                config.headers.Authorization = authHeader;
                console.log('Set Authorization header:', authHeader.substring(0, 50) + '...');
            }

            if (refreshToken) {
                config.headers['X-Refresh-Token'] = refreshToken;
                console.log('Set X-Refresh-Token header');
            }

            // Add user ID to request data if it exists
            const userId = localStorage.getItem('userId');
            if (userId && !config.data) {
                config.data = { user_id: userId };
            } else if (userId) {
                config.data = { ...config.data, user_id: userId };
            }
            
            return config;
        } catch (error) {
            console.error('Request interceptor error:', error);
            return Promise.reject(error);
        }
    },
    (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor to log cookies
authAxiosInstance.interceptors.response.use(
    (response) => {
        try {
            // Check for Set-Cookie header
            const setCookieHeader = response.headers['set-cookie'];
            if (setCookieHeader) {
                console.log('Set-Cookie header found:', setCookieHeader);
            }
            
            return response;
        } catch (error) {
            console.error('Response interceptor error:', error);
            return Promise.reject(error);
        }
    },
    (error) => {
        console.error('Response interceptor error:', error);
        return Promise.reject(error);
    }
);

export default authAxiosInstance;
