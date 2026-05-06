import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import '@mantine/core/styles.layer.css';
import { DatesProvider } from '@mantine/dates';
import '@mantine/dates/styles.css';
import { ContextMenuProvider } from 'mantine-contextmenu';
import 'mantine-contextmenu/styles.css';
import 'mantine-datatable/styles.layer.css';
import React, { Suspense } from 'react';
import createRefresh from 'react-auth-kit/createRefresh';
import ReactDOM from 'react-dom/client';
import './layout.css';
// Perfect Scrollbar
import 'react-perfect-scrollbar/dist/css/styles.css';

// Tailwind css
import './tailwind.css';

// Custom component styles
import './assets/css/service-cards.css';

// i18n (needs to be bundled)
import './i18n';

// Router
import { RouterProvider } from 'react-router-dom';
import router from './router/index';

// Redux
import AuthProvider from 'react-auth-kit';
import createStore from 'react-auth-kit/createStore';
import { Provider } from 'react-redux';
import store from './store/index';
import { ChatProvider } from './contexts/ChatContext';
import authAxiosInstance from './services/authAxiosInstance';

// Dynamic imports for non-critical paths
const i18n = import('./i18n');

// Memoized auth configuration
// const refresh = createRefresh({
//   interval: 60,
//   refreshApiCallback: async (param) => {
//     try {
//       const response = await authAxiosInstance('/refresh_token/', param);
//       return {
//         isSuccess: true,
//         newAuthToken: response.data.token,
//         newAuthTokenExpireIn: 60,
//         newRefreshTokenExpiresIn: 3600,
//       };
//     } catch (error) {
//       console.error(error);
//       return { isSuccess: false, newAuthToken: '' };
//     }
//   },
// });

// BE access token TTL is 30 minutes (Stores-BE/backend/settings.py
// ACCESS_TOKEN_LIFETIME_MINUTES). We refresh well before that to keep every
// outbound request authenticated and avoid the user-visible "logged out" jump.
const ACCESS_TOKEN_TTL_MINUTES = 30;
const REFRESH_INTERVAL_MINUTES = 10;

const authStore = createStore({
    authName: '_auth',
    authType: 'cookie',
    cookieDomain: window.location.hostname,
    cookieSecure: window.location.protocol === 'https:',
    debug: false,
    refresh: createRefresh({
        interval: REFRESH_INTERVAL_MINUTES,
        refreshApiCallback: async () => {
            try {
                // authAxiosInstance already has withCredentials: true, and the
                // request interceptor copies the _auth_refresh cookie into the
                // X-Refresh-Token header that the BE TokenRefreshView expects.
                const response = await authAxiosInstance.post('/refresh_token/', null);

                const authHeader: string | undefined =
                    response.headers?.authorization || response.headers?.Authorization;

                if (!authHeader) {
                    throw new Error('Refresh response missing Authorization header');
                }

                // Match the cookie format the LoginUser thunk uses
                // (Bearer-prefixed) so the request interceptor's
                // already-prefixed branch handles both flows identically.
                const newToken = authHeader.startsWith('Bearer ')
                    ? authHeader
                    : `Bearer ${authHeader}`;

                return {
                    isSuccess: true,
                    newAuthToken: newToken,
                    newAuthTokenExpireIn: ACCESS_TOKEN_TTL_MINUTES,
                };
            } catch (error) {
                console.error('[auth] token refresh failed', error);
                return {
                    isSuccess: false,
                    newAuthToken: '',
                };
            }
        },
    }),
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <Suspense>
            <ColorSchemeScript defaultColorScheme="auto" />
            <MantineProvider withGlobalClasses>
                <ContextMenuProvider zIndex={5000} shadow="md" borderRadius="md">
                    <DatesProvider settings={{ locale: 'en' }}>
                        <Provider store={store}>
                            <AuthProvider store={authStore}>
                                <ChatProvider>
                                    {/* <PersistGate loading={null} persistor={persistor}> */}
                                    <RouterProvider router={router} />
                                    {/* </PersistGate> */}
                                </ChatProvider>
                            </AuthProvider>
                        </Provider>
                    </DatesProvider>
                </ContextMenuProvider>
            </MantineProvider>
        </Suspense>
    </React.StrictMode>
);
