'use client';

import {
    faEnvelope,
    faLock,
    faEye,
    faEyeSlash,
    faExclamationCircle,
    faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ErrorMessage, Field, Form, Formik } from 'formik';
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import * as Yup from 'yup';
import { motion, AnimatePresence } from 'framer-motion';
import { AppDispatch, IRootState } from '../../store/index';
import { useDispatch, useSelector } from 'react-redux';
import { LoginUser, MfaLoginUser } from '../../store/authSlice';
import useSignIn from 'react-auth-kit/hooks/useSignIn';
import { ThunkDispatch, AnyAction } from '@reduxjs/toolkit';
import { useEffect } from 'react';
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated';

interface LoginFormValues {
    email: string;
    password: string;
    rememberMe: boolean;
}

const LoginSchema = Yup.object().shape({
    email: Yup.string().email('Please enter a valid email address').required('Email is required'),
    password: Yup.string().required('Password is required'),
});

const Login: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isAuthenticated = useIsAuthenticated();
    const dispatch: ThunkDispatch<IRootState, unknown, AnyAction> = useDispatch();
    const signIn = useSignIn();
    const [showPassword, setShowPassword] = useState(false);
    const [loginAttempts, setLoginAttempts] = useState(0);

    const { loading, error, user } = useSelector((state: IRootState) => state.auth);
    const from = new URLSearchParams(location.search).get('from') || '/admin/dashboard';

    useEffect(() => {
        if (isAuthenticated) {
            navigate(from);
        }
    }, [isAuthenticated, navigate, from]);

    const handleSubmit = async (values: LoginFormValues, { setSubmitting }: any) => {
        try {
            setLoginAttempts((prev) => prev + 1);

            if (loginAttempts >= 5) {
                setSubmitting(false);
                return;
            }

            await dispatch(
                LoginUser({
                    email: values.email,
                    password: values.password,
                    extra: {
                       signIn,
                    },
                })
            ).unwrap();

            // Navigate on successful login
            navigate(from);
        } catch (error) {
            console.error('Login error:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const togglePasswordVisibility = () => setShowPassword(!showPassword);

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-orange-50 to-orange-100 flex items-center justify-center p-4">
            {/* Centered Login Form */}
            <div className="w-full max-w-md">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="w-full">
                    {/* Main Card */}
                    <div className="bg-white border border-orange-200 rounded-3xl shadow-2xl p-8">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}>
                                <div className="flex justify-center mb-4">
                                    <img className="h-12" src="/assets/images/tradehut3.png" alt="TradeHut Stores" />
                                </div>
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
                                <p className="text-gray-600 text-sm">Sign in to your TradeHut Stores account</p>
                            </motion.div>
                        </div>

                        {/* Error Message */}
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6"
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                >
                                    <div className="flex items-center">
                                        <FontAwesomeIcon icon={faExclamationCircle} className="text-red-500 mr-3" />
                                        <div>
                                            <p className="text-red-700 text-sm font-medium">Authentication Failed</p>
                                            <p className="text-red-600 text-xs mt-1">{error}</p>
                                        </div>
                                    </div>
                                    {loginAttempts >= 3 && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 pt-3 border-t border-red-200">
                                            <Link to="/forgot-password" className="text-red-600 text-xs hover:text-red-500 transition-colors underline">
                                                Reset your password
                                            </Link>
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Login Form */}
                        <Formik
                            initialValues={{
                                email: '',
                                password: '',
                                rememberMe: false,
                            }}
                            validationSchema={LoginSchema}
                            onSubmit={handleSubmit}
                        >
                            {({ isSubmitting, errors, touched, values }) => (
                                <Form className="space-y-6">
                                    {/* Email Field */}
                                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <FontAwesomeIcon
                                                    icon={faEnvelope}
                                                    className={`h-5 w-5 transition-colors ${errors.email && touched.email ? 'text-red-500' : values.email ? 'text-orange-500' : 'text-gray-400'}`}
                                                />
                                            </div>
                                            <Field
                                                name="email"
                                                type="email"
                                                className={`w-full pl-12 pr-4 py-4 bg-gray-50 border transition-all duration-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
                                                    errors.email && touched.email
                                                        ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                                                        : 'border-gray-300 focus:ring-orange-500/20 focus:border-orange-500 hover:border-orange-300'
                                                }`}
                                                placeholder="your@email.com"
                                            />
                                            {errors.email && touched.email && (
                                                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                                    <FontAwesomeIcon icon={faExclamationCircle} className="text-red-500 h-5 w-5" />
                                                </div>
                                            )}
                                        </div>
                                        <ErrorMessage name="email">
                                            {(msg) => (
                                                <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-600 text-sm mt-2">
                                                    {msg}
                                                </motion.p>
                                            )}
                                        </ErrorMessage>
                                    </motion.div>

                                    {/* Password Field */}
                                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-sm font-semibold text-gray-700">Password</label>
                                            <Link to="/forgot-password" className="text-sm text-orange-600 hover:text-orange-500 transition-colors">
                                                Forgot?
                                            </Link>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <FontAwesomeIcon
                                                    icon={faLock}
                                                    className={`h-5 w-5 transition-colors ${
                                                        errors.password && touched.password ? 'text-red-500' : values.password ? 'text-orange-500' : 'text-gray-400'
                                                    }`}
                                                />
                                            </div>
                                            <Field
                                                name="password"
                                                type={showPassword ? 'text' : 'password'}
                                                className={`w-full pl-12 pr-12 py-4 bg-gray-50 border transition-all duration-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
                                                    errors.password && touched.password
                                                        ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                                                        : 'border-gray-300 focus:ring-orange-500/20 focus:border-orange-500 hover:border-orange-300'
                                                }`}
                                                placeholder="Enter your password"
                                            />
                                            <button
                                                type="button"
                                                onClick={togglePasswordVisibility}
                                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="h-5 w-5" />
                                            </button>
                                        </div>
                                        <ErrorMessage name="password">
                                            {(msg) => (
                                                <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-600 text-sm mt-2">
                                                    {msg}
                                                </motion.p>
                                            )}
                                        </ErrorMessage>
                                    </motion.div>

                                    {/* Remember Me */}
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex items-center">
                                        <Field name="rememberMe" type="checkbox" className="h-4 w-4 text-orange-600 focus:ring-orange-500/20 border-gray-300 rounded bg-gray-50" />
                                        <label className="ml-3 text-sm text-gray-700">Keep me signed in</label>
                                    </motion.div>

                                    {/* Submit Button */}
                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                                        <motion.button
                                            type="submit"
                                            disabled={isSubmitting || loading}
                                            className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 shadow-lg hover:shadow-xl"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            {isSubmitting || loading ? (
                                                <div className="flex items-center justify-center">
                                                    <motion.div
                                                        animate={{ rotate: 360 }}
                                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"
                                                    />
                                                    Signing in...
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center">
                                                    Sign In
                                                    <FontAwesomeIcon icon={faArrowRight} className="ml-2 h-4 w-4" />
                                                </div>
                                            )}
                                        </motion.button>
                                    </motion.div>
                                </Form>
                            )}
                        </Formik>

                        {/* Footer */}
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="text-center mt-6">
                            <p className="text-sm text-gray-600">
                                Don't have an account?{' '}
                                <Link to="/register" className="text-orange-600 hover:text-orange-500 font-semibold transition-colors">
                                    Sign up
                                </Link>
                            </p>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
