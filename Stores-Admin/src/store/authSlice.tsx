import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import ShowRequestError from '../helper/showRequestError';
import axiosInstance from '../services/axiosInstance';
import authAxiosInstance from '../services/authAxiosInstance';
import renderErrorMessage from '../helper/renderErrorMessage';

interface AuthState {
    isLoggedIn: boolean;
    loading: boolean;
    user: any | null;
    error: string | null;
    message: string | null;
}

const initialState: AuthState = {
    isLoggedIn: false,
    loading: false,
    user: null,
    error: null,
    message: null,
};

const ERROR_MESSAGES = {
    DEFAULT: 'An error occurred',
    LOGIN_FAILED: 'Invalid username or password',
    REGISTER_FAILED: 'signup failed. Please try again.',
    RESET_PASSWORD_FAILED: 'Failed to reset the password. Please try again.',
    FORGOT_PASSWORD_FAILED: 'Failed to request password reset. Please try again.',
};

export const LoginUser = createAsyncThunk(
    'auth/LoginUser',
    async ({ email, password, extra }: { email?: string; password: string; extra?: any }, { rejectWithValue }) => {
        const payload = { email, password };

        console.log("🔍 LOGIN THUNK STARTED");
        console.log("Payload:", payload);
        console.log("Extra passed into thunk:", extra);

        try {
            const response = await authAxiosInstance.post('/admin-login/', payload);

            console.log("Full Axios response:", response);

            let accessToken = response.headers['authorization'];
            let refreshToken = response.headers['x-refresh-token'];

            console.log("Raw Access header:", accessToken);
            console.log("Raw Refresh header:", refreshToken);

            if (accessToken?.startsWith("Bearer ")) {
                console.log("Access token BEFORE cleanup:", accessToken);
                accessToken = accessToken.substring(7);
                console.log("Access token AFTER cleanup:", accessToken);
            }

            if (refreshToken?.startsWith("Bearer ")) {
                console.log("Refresh token BEFORE cleanup:", refreshToken);
                refreshToken = refreshToken.substring(7);
                console.log("Refresh token AFTER cleanup:", refreshToken);
            }

            console.log("Extracted tokens:", { accessToken, refreshToken });

            const user = response.data.user;
            console.log("User from backend:", user);

            // Debug cookies BEFORE sign-in
            console.log("Cookies BEFORE signIn:", document.cookie);

            
            console.log("Calling signIn with:", {
                auth: { token: accessToken, type: 'Bearer' },
                refresh: refreshToken,
                userState: user,
                expiresIn: 60,
            });
            
            const { signIn } = extra;
            const isSignedIn = signIn({
                auth: {
                    token: accessToken,
                    type: 'Bearer',
                },
                refresh: refreshToken,
                userState: user,
            });


        } catch (error: any) {
            console.error("💥 ERROR during login:", error);

            ShowRequestError(error);

            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(error.response.data, "text/html");
                const message = doc.querySelector("body")?.innerText ?? "Unknown error";
                const refined = message.split("\n")[1] ?? message;

                return rejectWithValue(refined);
            } catch {
                return rejectWithValue("Login failed unexpectedly");
            }
        }
    }
);


export const MfaLoginUser = createAsyncThunk('auth/MfaLoginUser', async (
    { email, password, extra }: { email: string; password: string; extra?: any },
    { rejectWithValue }
) => {
    // Attach device context for trusted-device fast-path
    // Pass user email to check for user changes and clear fingerprint if needed
    // TODO: Implement device fingerprinting functionality
    const device_id = null;
    const device_name = null;
    const fingerprint = null;
    const device_info = null;
    const payload = { email, password, device_id, device_name, fingerprint, device_info };

    try {
        const response = await authAxiosInstance.post('/mfa/login/', payload);
        const data = response.data;

        // Fast-path: trusted device recognized, backend returns tokens directly
        if (response.status === 200 && data && data.requires_otp === false) {
            // Handle case-insensitive header access (axios normalizes headers to lowercase)
            const accessToken = response?.headers['authorization'] || response?.headers['Authorization'];
            const refreshToken = response?.headers['x-refresh-token'] || response?.headers['X-Refresh-Token'];


            // Validate tokens exist before proceeding
            if (!accessToken || !refreshToken) {
                console.error('Error: Missing tokens from server response');
                console.error('Response headers:', response.headers);
                throw new Error('Invalid token response from server - tokens not found in response headers');
            }

            const user = response.data;

            if (extra && extra.signIn) {
                const { signIn } = extra;
                
                // Ensure token format is correct (remove 'Bearer ' prefix if present, then add it back)
                const cleanAccessToken = accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}`;
                
                const isSignedIn = signIn({
                    auth: {
                        token: cleanAccessToken,
                        type: 'Bearer',
                    },
                    refresh: refreshToken,
                    userState: user,
                    expiresIn: 60,
                });

                // Also set cookies manually to ensure axios interceptor can read them immediately
                // This is critical because react-auth-kit might not set cookies synchronously
                if (cleanAccessToken) {
                    const expires = new Date();
                    expires.setTime(expires.getTime() + (24 * 60 * 60 * 1000)); // 24 hours
                    document.cookie = `_auth=${encodeURIComponent(cleanAccessToken)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
                }
                if (refreshToken) {
                    const expires = new Date();
                    expires.setTime(expires.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
                    document.cookie = `_auth_refresh=${encodeURIComponent(refreshToken)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
                }

                // Verify cookies were set
                const authCookie = document.cookie.split('; ').find(row => row.startsWith('_auth='));
                const refreshCookie = document.cookie.split('; ').find(row => row.startsWith('_auth_refresh='));


                if (!isSignedIn) {
                    console.error('Frontend sign-in failed');
                    throw new Error('Frontend sign-in failed');
                }
            }

            return {
                success: true,
                requires_otp: false,
                user,
            };
        }


        
        // Default path: proceed to OTP verification
        if (response.status === 200 && data.next_step === 'verify_otp') {
            return {
                success: true,
                message: data.message,
                masked_email: data.masked_email,
                validity_minutes: data.validity_minutes,
                user_id: data.user_id,
                session_id: data.session_id,
                next_step: 'verify_otp'
            };
        }

        // If we get here, something unexpected happened
        throw new Error('Unexpected response from server');

    } catch (error: any) {
        console.error('MFA Login Error:', error);
        return rejectWithValue(error);
    }
});


export const VerifyMfaLogin = createAsyncThunk(
    'auth/VerifyMfaLogin',
    async (
        {
            email,
            otp_code,
            extra,
            trust_device,
            device_id,
            device_name,
            fingerprint,
            user_id,
            session_id,
            device_info,
        }: {
            email?: string;
            otp_code: string;
            extra?: any;
            trust_device?: boolean;
            device_id?: string;
            device_name?: string;
            fingerprint?: string;
            user_id?: string;
            session_id?: string;
            device_info?: any;
        },
        { rejectWithValue }
    ) => {
    const payload: any = {
        email,
        user_id,
        session_id,
        otp_code,
        otp_type: 'login',
        trust_device: Boolean(trust_device),
        device_id,
        device_name,
        fingerprint,
        device_info,
    };

    try {
        const response = await authAxiosInstance.post('mfa/verify/', payload);

        const accessToken = response?.headers['authorization'];
        const refreshToken = response?.headers['x-refresh-token'];

        const user = response.data;

        if (!accessToken || !refreshToken) {
            console.error('Error: Missing tokens from server response');
            throw new Error('Invalid token response from server');
        }

        // Update device fingerprint user tracking after successful OTP verification
        // This will check if user has changed and clear fingerprint if needed

        const { signIn } = extra;
        const isSignedIn = signIn({
            auth: {
                token: accessToken,
                type: 'Bearer',
            },
            refresh: refreshToken,
            userState: user,
            expiresIn: 60,
        });
        localStorage.setItem('userId', user?.id);

        if (!isSignedIn) {
            console.error('Frontend sign-in failed');
            throw new Error('Frontend sign-in failed');
        }

        return user;
    } catch (error: any) {
        // ShowRequestError(error);
        console.error('Error during login:', error);

        const parser = new DOMParser();
        const errorData = error.response.data;
        const doc = parser.parseFromString(errorData, 'text/html');
        const errorMess = doc.querySelector('body')?.innerText ?? 'An error occurred';
        const errorMessage = errorMess.split('\n')[1];

        return rejectWithValue(error);
    }
});


export const LogoutUser = createAsyncThunk('auth/LogoutUser', async (extra: any, { dispatch }) => {
    try {
        const response = await authAxiosInstance.post('/logout/');

        if (response.status === 200) {
            dispatch(resetAuth());
            const { signOut } = extra;
            signOut();
        }
    } catch (error: any) {
        console.error('Logout error:', error);
        throw new Error(error.response?.data?.message || ERROR_MESSAGES.DEFAULT);
    }
});

export const RegisterUser = createAsyncThunk(
    'auth/RegisterUser',
    async ({ userOrEmail, password, confirm_password, first_name, last_name, phone_number, accountType }: { userOrEmail: { email?: string; username?: string }; password: string; confirm_password: string, first_name: string, last_name: string, phone_number: string, accountType: string }, { rejectWithValue }) => {
        const payload = { ...userOrEmail, password, first_name, last_name, password2: confirm_password, phone_number, account_type: accountType };
        try {
            const response = await authAxiosInstance.post('/register/', payload);
            return response.data;
        } catch (error: any) {
            ShowRequestError(error);
            console.error('Error during register:', error);
    
            
    
            return rejectWithValue(error);
        }
    }
);

export const ProviderRegisterUser = createAsyncThunk(
    'auth/RegisterUser',
    async (providerPayload: any, { rejectWithValue }) => {
        try {
            const response = await authAxiosInstance.post('/register/provider/', providerPayload);
            return response;
        } catch (error: any) {
            console.error('Error during register:', error);
    
            const parser = new DOMParser();
            const errorData = error.response.data;
            const doc = parser.parseFromString(errorData, 'text/html');
            const errorMess = doc.querySelector('body')?.innerText ?? 'An error occurred';
            const errorMessage = errorMess.split('\n')[1];
    
            return rejectWithValue(error);
        }
    }
);

export const ForgetPassword = createAsyncThunk('auth/ForgetPassword', async ({ email }: { email: string }) => {
    try {
        const response = await authAxiosInstance.post('/forget_password/', { email });
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || ERROR_MESSAGES.FORGOT_PASSWORD_FAILED);
    }
});

export const ResetPassword = createAsyncThunk('auth/ResetPassword', async ({ password, uidb64, token }: { password: string; uidb64:string, token: string }) => {
    try {
        const response = await authAxiosInstance.post('/reset_password/uidb64/token/', { password, uidb64, token });
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || ERROR_MESSAGES.RESET_PASSWORD_FAILED);
    }
});

export const SendOTP = createAsyncThunk('auth/SendOTP', async ({ email, type }: { email: string; type: 'signup' | 'login' }) => {
    try {
        const endpoint = type === 'signup' ? '/send_signup_otp/' : '/send_login_otp/';
        const response = await authAxiosInstance.post(endpoint, { email });
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Failed to send OTP');
    }
});

export const VerifyOTP = createAsyncThunk('auth/VerifyOTP', async ({ email, otp, type }: { email: string; otp: string; type: 'signup' | 'login' }, { rejectWithValue }) => {
    try {
        const response = await authAxiosInstance.post("/otp/verify/", { email, otp_code:otp, otp_type: type });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error || 'Invalid OTP code');
    }
});

export const ResendOTP = createAsyncThunk('auth/ResendOTP', async ({ email, otp_type }: { email: string; otp_type: string }, { rejectWithValue }) => {
    try {
        const response = await authAxiosInstance.post("otp/resend/", { email, otp_type });
        return response.data;
    } catch (error: any) {
        console.error('Error during resend OTP:', error);

        const parser = new DOMParser();
        const errorData = error.response.data;
        const doc = parser.parseFromString(errorData, 'text/html');
        const errorMess = doc.querySelector('body')?.innerText ?? 'An error occurred';
        const errorMessage = errorMess.split('\n')[1];

        return rejectWithValue(error);
    }
});

// Slice
const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        resetAuth: (state) => {
            state.isLoggedIn = false;
            state.user = null;
            state.error = null;
            state.message = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(LoginUser.pending, (state) => {
                state.loading = true;
            })
            .addCase(LoginUser.fulfilled, (state, action) => {
                state.user = action.payload;
                state.isLoggedIn = true;
                localStorage.setItem('userRole', state.user.role);
                state.loading = false;
                state.message = 'Login successful';
            })
            .addCase(LoginUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message ?? ERROR_MESSAGES.LOGIN_FAILED;
                state.message = null;
            })
            .addCase(LogoutUser.pending, (state) => {
                state.loading = true;
            })
            .addCase(LogoutUser.fulfilled, (state) => {
                state.user = null;
                state.isLoggedIn = false;
                state.loading = false;
                state.message = 'Logged out successfully';
            })
            .addCase(LogoutUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || ERROR_MESSAGES.DEFAULT;
            })
            .addCase(RegisterUser.pending, (state) => {
                state.loading = true;
            })
            .addCase(RegisterUser.fulfilled, (state, action) => {
                state.message = action.payload.message;
                state.loading = false;
            })
            .addCase(RegisterUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || ERROR_MESSAGES.REGISTER_FAILED;
                state.message = null;
            })
            .addCase(ForgetPassword.pending, (state) => {
                state.loading = true;
            })
            .addCase(ForgetPassword.fulfilled, (state, action) => {
                state.message = action.payload.message;
                state.loading = false;
            })
            .addCase(ForgetPassword.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || ERROR_MESSAGES.FORGOT_PASSWORD_FAILED;
                state.message = null;
            })
            .addCase(ResetPassword.pending, (state) => {
                state.loading = true;
            })
            .addCase(ResetPassword.fulfilled, (state, action) => {
                state.message = action.payload.message;
                state.loading = false;
            })
            .addCase(ResetPassword.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || ERROR_MESSAGES.RESET_PASSWORD_FAILED;
                state.message = null;
            })
            .addCase(SendOTP.pending, (state) => {
                state.loading = true;
            })
            .addCase(SendOTP.fulfilled, (state, action) => {
                state.message = action.payload.message || 'OTP sent successfully';
                state.loading = false;
                state.error = null;
            })
            .addCase(SendOTP.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to send OTP';
                state.message = null;
            })
            .addCase(VerifyOTP.pending, (state) => {
                state.loading = true;
            })
            .addCase(VerifyOTP.fulfilled, (state, action) => {
                state.message = action.payload.message || 'OTP verified successfully';
                state.loading = false;
                state.error = null;
            })
            .addCase(VerifyOTP.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Invalid OTP code';
                state.message = null;
            })
            .addCase(ResendOTP.pending, (state) => {
                state.loading = true;
            })
            .addCase(ResendOTP.fulfilled, (state, action) => {
                state.message = action.payload.message || 'OTP resent successfully';
                state.loading = false;
                state.error = null;
            })
            .addCase(ResendOTP.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to resend OTP';
                state.message = null;
            });
    },
});

export const { resetAuth } = authSlice.actions;

export default authSlice.reducer;
