'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faUserShield, faArrowLeft, faCheckCircle, faShieldAlt, faDatabase, faUsers, faCog, faGlobe } from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '../../store';
import { RootState } from '../../store/store';
import { ForgetPassword } from '../../store/authSlice';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const dispatch = useDispatch<AppDispatch>();
    const { loading, error, message } = useSelector((state: RootState) => state.auth);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            const resultAction = await dispatch(ForgetPassword({ email })).unwrap();
            
            if (resultAction) {
                setIsSubmitted(true);
            }
        } catch (error) {
            console.error('Password reset error:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex">
            {/* Left Side - Admin Hero Section */}
            <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
                {/* Background Elements */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800/90 via-gray-900/95 to-slate-900/90"></div>

                {/* Admin Pattern Overlay */}
                <div className="absolute inset-0 opacity-10">
                    <div
                        className="w-full h-full"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Ccircle cx='21' cy='21' r='2'/%3E%3Ccircle cx='33' cy='33' r='2'/%3E%3Ccircle cx='45' cy='45' r='2'/%3E%3Ccircle cx='51' cy='9' r='2'/%3E%3Ccircle cx='39' cy='21' r='2'/%3E%3Ccircle cx='27' cy='33' r='2'/%3E%3Ccircle cx='15' cy='45' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                        }}
                    ></div>
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center px-12 py-12 text-white">
                    <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="max-w-lg">
                        {/* Logo */}
                        <div className="flex items-center mb-8">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-2xl shadow-lg mr-4">
                                <FontAwesomeIcon icon={faUserShield} className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white">MoreVans Admin</h1>
                                <p className="text-slate-300 text-sm">Administrative Control Center</p>
                            </div>
                        </div>

                        {/* Main Content */}
                        <h2 className="text-4xl font-bold mb-6 leading-tight">
                            Admin Account <span className="text-blue-400">Recovery</span>
                        </h2>
                        <p className="text-xl text-slate-200 mb-8 leading-relaxed">
                            Secure administrative account recovery. Enter your admin email address and we'll send you a secure link to reset your password and restore access to the control panel.
                        </p>

                        {/* Security Features */}
                        <div className="space-y-4 mb-8">
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="flex items-center">
                                <div className="bg-white/20 rounded-full p-2 mr-4">
                                    <FontAwesomeIcon icon={faShieldAlt} className="h-5 w-5 text-blue-400" />
                                </div>
                                <span className="text-white">Enterprise-grade security encryption</span>
                            </motion.div>
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="flex items-center">
                                <div className="bg-white/20 rounded-full p-2 mr-4">
                                    <FontAwesomeIcon icon={faCog} className="h-5 w-5 text-blue-400" />
                                </div>
                                <span className="text-white">Secure links expire in 15 minutes</span>
                            </motion.div>
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }} className="flex items-center">
                                <div className="bg-white/20 rounded-full p-2 mr-4">
                                    <FontAwesomeIcon icon={faUsers} className="h-5 w-5 text-blue-400" />
                                </div>
                                <span className="text-white">Admin-only access restoration</span>
                            </motion.div>
                        </div>

                        {/* Support Note */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                            className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
                        >
                            <div className="text-center">
                                <p className="text-white/90 text-sm mb-2">Need immediate admin assistance?</p>
                                <p className="text-blue-400 font-semibold">System Admin Support: 1-800-ADMIN-HELP</p>
                                <p className="text-white/70 text-xs mt-1">Available 24/7 for administrative recovery</p>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>

                {/* Floating Elements */}
                <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute top-1/4 right-12 w-20 h-20 bg-blue-500/20 rounded-full backdrop-blur-sm"
                ></motion.div>
                <motion.div
                    animate={{ y: [0, 15, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                    className="absolute bottom-1/4 right-24 w-12 h-12 bg-indigo-500/30 rounded-full backdrop-blur-sm"
                ></motion.div>
            </div>

            {/* Right Side - Reset Form */}
            <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center justify-center mb-8">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-xl shadow-lg mr-3">
                            <FontAwesomeIcon icon={faUserShield} className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">MoreVans Admin</h1>
                            <p className="text-slate-300 text-xs">Control Center</p>
                        </div>
                    </div>

                    {/* Main Card */}
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8">
                        <AnimatePresence mode="wait">
                            {!isSubmitted ? (
                                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    {/* Header */}
                                    <div className="text-center mb-8">
                                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}>
                                            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                                <FontAwesomeIcon icon={faUserShield} className="h-8 w-8 text-white" />
                                            </div>
                                            <h2 className="text-3xl font-bold text-white mb-2">Reset Admin Password</h2>
                                            <p className="text-gray-300 text-sm">Enter your admin email for secure password reset</p>
                                        </motion.div>
                                    </div>

                                    {/* Reset Form */}
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                                            <label className="block text-sm font-semibold text-gray-200 mb-2">Admin Email Address</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <FontAwesomeIcon icon={faEnvelope} className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    required
                                                    className="w-full pl-12 pr-4 py-4 bg-white/5 backdrop-blur-sm border border-white/20 transition-all duration-300 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 hover:border-white/30"
                                                    placeholder="admin@morevans.com"
                                                />
                                            </div>
                                        </motion.div>

                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                                            <motion.button
                                                type="submit"
                                                disabled={isLoading || !email}
                                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-lg hover:shadow-xl"
                                                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                                                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                                            >
                                                {isLoading ? (
                                                    <div className="flex items-center justify-center">
                                                        <motion.div
                                                            animate={{ rotate: 360 }}
                                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"
                                                        />
                                                        Sending Reset Link...
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center">
                                                        <FontAwesomeIcon icon={faUserShield} className="mr-3 h-4 w-4" />
                                                        Send Admin Reset Link
                                                    </div>
                                                )}
                                            </motion.button>
                                        </motion.div>
                                    </form>

                                    {/* Security Notice */}
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6">
                                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
                                            <div className="flex items-center justify-center mb-2">
                                                <FontAwesomeIcon icon={faShieldAlt} className="text-blue-400 mr-2 h-4 w-4" />
                                                <span className="text-blue-200 text-sm font-medium">Administrative Security</span>
                                            </div>
                                            <p className="text-blue-300 text-xs">All admin password reset attempts are logged and monitored for security purposes.</p>
                                        </div>
                                    </motion.div>

                                    {/* Back to Login */}
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-center mt-8">
                                        <Link to="/login" className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium">
                                            <FontAwesomeIcon icon={faArrowLeft} className="mr-2 h-4 w-4" />
                                            Back to Admin Sign In
                                        </Link>
                                    </motion.div>
                                </motion.div>
                            ) : (
                                <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="text-center">
                                    {/* Success Icon */}
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                                        className="bg-gradient-to-r from-green-500 to-emerald-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
                                    >
                                        <FontAwesomeIcon icon={faCheckCircle} className="h-10 w-10 text-white" />
                                    </motion.div>

                                    {/* Success Message */}
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                                        <h2 className="text-2xl font-bold text-white mb-4">Reset Link Sent!</h2>
                                        <p className="text-gray-300 mb-6 leading-relaxed">
                                            We've sent a secure password reset link to <strong className="text-blue-400">{email}</strong>. Please check your email and follow the instructions to reset
                                            your admin password.
                                        </p>
                                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
                                            <p className="text-blue-300 text-sm">
                                                <FontAwesomeIcon icon={faShieldAlt} className="mr-2" />
                                                The reset link will expire in 15 minutes for security reasons.
                                            </p>
                                        </div>
                                    </motion.div>

                                    {/* Actions */}
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="space-y-4">
                                        <button
                                            onClick={() => setIsSubmitted(false)}
                                            className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium py-3 px-6 rounded-xl transition-all duration-300"
                                        >
                                            Send Another Link
                                        </button>
                                        <Link
                                            to="/login"
                                            className="block w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 text-center"
                                        >
                                            Back to Admin Login
                                        </Link>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Footer */}
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="text-center mt-6">
                            <div className="flex items-center justify-center text-xs text-gray-500 space-x-4">
                                <div className="flex items-center">
                                    <FontAwesomeIcon icon={faGlobe} className="mr-1" />
                                    Multi-tenant
                                </div>
                                <div className="flex items-center">
                                    <FontAwesomeIcon icon={faShieldAlt} className="mr-1" />
                                    SSL Secured
                                </div>
                                <div className="flex items-center">
                                    <FontAwesomeIcon icon={faDatabase} className="mr-1" />
                                    Real-time
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
