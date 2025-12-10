# React TypeScript Technical Documentation

Project Overview

This documentation describes the Alumni Portal Frontend, 
a web application for managing policies bought by alumni groups. 
The application allows users to create, view, update, 
and delete various resources essential for managing alumni-related activities. 
The system is undergoing further refactoring and typing enhancements 
to ensure optimal performance and maintainability.


## Getting Started

**Alumni Portal Frontend** is a web application that facilitates the management of policies and resources associated with alumni groups.

---

## Key Features

The system allows for the creation, deletion, updating, and viewing of the following resources:

- `alumni_groups`
- `amendments`
- `attachments`
- `audit_trails`
- `beneficiaries`
- `benefits`
- `contract_members`
- `contracts`
- `group_members`
- `insurance_packages`
- `invites`
- `invoices`
- `payment_methods`
- `payments`
- `users`

---

## Technologies Used

- **React**: Frontend library for building user interfaces.
- **TypeScript**: For static typing and improved developer experience.
- **Redux**: For state management.
- **Axios**: For API integration.
- **React Auth Kit**: Middleware for authentication and token validation.
- **Tailwind CSS**: For styling.

---

## Setup and Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/Ellis-Ayikwei/alumni-portal-FE.git
    ```
2. Navigate to the project directory:
    ```bash
    cd alumni-portal-FE
    ```
3. Install dependencies:
    ```bash
    npm install
    ```
4. Start the development server:
    ```bash
    npm run dev
    ```
5. Open your browser and navigate to `http://localhost:3000`.

---

## Available Scripts

Check the `package.json` file for available scripts such as `start`, `build`, `test`, and `lint`.

---

## State Management

State management uses Redux and asynchronous requests are handled with Redux Thunks. Below is an example of token handling with Axios instances and interceptors:

```typescript
const authAxiosInstance = axios.create({
    baseURL: authApiUrl,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

authAxiosInstance.interceptors.request.use(
    (config) => {
        const token = getCookie('_auth');
        config.headers.Authorization = token ?? '';
        config.headers['X-Refresh-Token'] = getCookie('_auth_refresh') ?? '';

        if (!config.data) {
            config.data = {
                user_id: localStorage.getItem('userId') ?? 'default_user_id',
            };
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default authAxiosInstance;

const refreshTokens = async (): Promise<{ accessToken: string; refreshToken: string }> => {
    try {
        const response = await authAxiosInstance.post('/refresh_token');
        const accessToken = response.headers['authorization']?.split(' ')[1];
        const refreshToken = response.headers['x-refresh-token'];
        return { accessToken, refreshToken };
    } catch (err) {
        throw new Error('Token refresh failed');
    }
};

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response.status === 401) {
            try {
                const { accessToken, refreshToken } = await refreshTokens();
                const signIn = useSignIn();
                signIn({
                    auth: {
                        token: accessToken,
                        type: 'Bearer',
                    },
                    refresh: refreshToken,
                });

                // Retry the original request
                error.config.headers['Authorization'] = `Bearer ${accessToken}`;
                return await authAxiosInstance.request(error.config);
            } catch (refreshError) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);
```

---

## API Integration

API integration is managed with Axios instances and includes token validation and refresh logic. Below is an example of a login flow:

```typescript
export const LoginUser = createAsyncThunk(
    'auth/LoginUser',
    async ({ userOrEmail, password, extra }: { userOrEmail: { email?: string; username?: string }; password: string; extra?: any }, { rejectWithValue }) => {
        try {
            const response = await authAxiosInstance.post('/login', { ...userOrEmail, password });

            const accessToken = response.headers['authorization'];
            const refreshToken = response.headers['x-refresh-token'];
            const user = response.data;

            if (!accessToken || !refreshToken) {
                throw new Error('Invalid token response from server');
            }

            const { signIn } = extra;
            signIn({
                auth: {
                    token: accessToken,
                    type: 'Bearer',
                },
                refresh: refreshToken,
                userState: user,
            });

            localStorage.setItem('userId', user?.id);

            return user;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Login failed');
        }
    }
);
```

---

Ensure all critical components and API integrations are covered in test cases.

---

This documentation provides a comprehensive overview of the Alumni Portal Frontend. For further assistance, refer to the project repository.