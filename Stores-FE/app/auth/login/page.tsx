'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSignIn from 'react-auth-kit/hooks/useSignIn'
import { Form, Input, Button, Checkbox, message, Divider } from 'antd'
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react'
import axios from 'axios'

export default function LoginPage() {
    const signIn = useSignIn()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const handleLogin = async (values: any) => {
        setLoading(true)
        try {
            // Replace with your actual API endpoint
            const response = await axios.post('/api/auth/login', {
                email: values.email,
                password: values.password,
            })

            if (response.data.token) {
                signIn({
                    token: response.data.token,
                    expiresIn: 3600,
                    tokenType: 'Bearer',
                    authState: { user: response.data.user },
                })
                message.success('Login successful!')
                router.push('/profile')
            }
        } catch (error) {
            message.error('Invalid email or password')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800">
            <div className="max-w-md w-full mx-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-block mb-4">
                            <h1 className="text-3xl font-bold text-primary-500">TradeHutStores.com</h1>
                        </Link>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Welcome Back</h2>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">Please sign in to your account</p>
                    </div>

                    {/* Login Form */}
                    <Form
                        name="login"
                        onFinish={handleLogin}
                        layout="vertical"
                        requiredMark={false}
                    >
                        <Form.Item
                            name="email"
                            rules={[
                                { required: true, message: 'Please enter your email' },
                                { type: 'email', message: 'Please enter a valid email' },
                            ]}
                        >
                            <Input
                                prefix={<Mail className="h-4 w-4 text-gray-400" />}
                                placeholder="Email Address"
                                size="large"
                                className="rounded-lg"
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[{ required: true, message: 'Please enter your password' }]}
                        >
                            <Input.Password
                                prefix={<Lock className="h-4 w-4 text-gray-400" />}
                                placeholder="Password"
                                size="large"
                                className="rounded-lg"
                                iconRender={(visible) =>
                                    visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />
                                }
                            />
                        </Form.Item>

                        <div className="flex items-center justify-between mb-6">
                            <Form.Item name="remember" valuePropName="checked" className="mb-0">
                                <Checkbox>Remember me</Checkbox>
                            </Form.Item>
                            <Link href="/auth/forgot-password" className="text-primary-500 hover:text-primary-600">
                                Forgot password?
                            </Link>
                        </div>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                size="large"
                                block
                                className="bg-primary-500 hover:bg-primary-600 border-0 h-12 rounded-lg font-semibold"
                                icon={<LogIn className="h-4 w-4" />}
                            >
                                Sign In
                            </Button>
                        </Form.Item>
                    </Form>

                    {/* Social Login */}
                    <Divider>Or continue with</Divider>
                    <div className="grid grid-cols-3 gap-3">
                        <Button size="large" className="rounded-lg">
                            Google
                        </Button>
                        <Button size="large" className="rounded-lg">
                            Facebook
                        </Button>
                        <Button size="large" className="rounded-lg">
                            Apple
                        </Button>
                    </div>

                    {/* Sign Up Link */}
                    <div className="text-center mt-6">
                        <span className="text-gray-600 dark:text-gray-400">Don't have an account? </span>
                        <Link href="/auth/register" className="text-primary-500 hover:text-primary-600 font-semibold">
                            Sign Up
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}