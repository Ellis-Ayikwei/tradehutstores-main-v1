import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Lock, Mail } from 'lucide-react';
import { IRootState } from '../../store/index';
import { useDispatch, useSelector } from 'react-redux';
import { LoginUser } from '../../store/authSlice';
import useSignIn from 'react-auth-kit/hooks/useSignIn';
import { ThunkDispatch, AnyAction } from '@reduxjs/toolkit';
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated';
import { safeInternalPath } from '../../helper/safeInternalPath';
import AuthLayout, { AuthError, AuthField, AuthSubmit } from './AuthLayout';

const LoginSchema = Yup.object().shape({
    email: Yup.string().email('Enter a valid email address.').required('Enter your email address.'),
    password: Yup.string().required('Enter your password.'),
});

// Attempts allowed on this page load before the form stops submitting and points to a reset.
const MAX_ATTEMPTS = 5;

const Login: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isAuthenticated = useIsAuthenticated();
    const dispatch: ThunkDispatch<IRootState, unknown, AnyAction> = useDispatch();
    const signIn = useSignIn();
    const [failedAttempts, setFailedAttempts] = useState(0);

    const { loading, error } = useSelector((state: IRootState) => state.auth);
    // Only same-origin app paths are honoured; anything else falls back to the default landing page.
    const explicitFrom = safeInternalPath(new URLSearchParams(location.search).get('from'));
    const from = explicitFrom || '/admin/dashboard';

    useEffect(() => {
        if (isAuthenticated) navigate(from);
    }, [isAuthenticated, navigate, from]);

    const locked = failedAttempts >= MAX_ATTEMPTS;

    const formik = useFormik({
        initialValues: { email: '', password: '' },
        validationSchema: LoginSchema,
        onSubmit: async (values) => {
            if (locked) return;
            try {
                // The effect above navigates once the session is stored.
                await dispatch(LoginUser({ email: values.email.trim(), password: values.password, extra: { signIn } })).unwrap();
            } catch {
                // The message comes from the auth slice (`error` above).
                setFailedAttempts((n) => n + 1);
            }
        },
    });

    const busy = formik.isSubmitting || loading;

    return (
        <AuthLayout title="Sign in" subtitle="Staff access to TradeHut Stores." footer={<Link to="/register" className="font-semibold text-primary hover:underline">Need an account?</Link>}>
            <form onSubmit={formik.handleSubmit} noValidate className="space-y-4">
                {locked ? (
                    <AuthError>
                        Too many failed attempts.{' '}
                        <Link to="/forgot-password" className="font-semibold underline">
                            Reset your password
                        </Link>{' '}
                        or reload the page to try again.
                    </AuthError>
                ) : (
                    error &&
                    failedAttempts > 0 && (
                        <AuthError>
                            {error}
                            {failedAttempts >= 3 && (
                                <>
                                    {' '}
                                    <Link to="/forgot-password" className="font-semibold underline">
                                        Reset your password
                                    </Link>
                                </>
                            )}
                        </AuthError>
                    )
                )}

                <AuthField
                    label="Email"
                    type="email"
                    icon={Mail}
                    autoComplete="email"
                    inputMode="email"
                    autoFocus
                    placeholder="you@company.com"
                    {...formik.getFieldProps('email')}
                    error={formik.touched.email ? formik.errors.email : undefined}
                />

                <AuthField
                    label="Password"
                    type="password"
                    icon={Lock}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    {...formik.getFieldProps('password')}
                    error={formik.touched.password ? formik.errors.password : undefined}
                    labelAction={
                        <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                            Forgot password?
                        </Link>
                    }
                />

                <AuthSubmit loading={busy} loadingLabel="Signing in..." disabled={locked}>
                    Sign in
                </AuthSubmit>
            </form>
        </AuthLayout>
    );
};

export default Login;
