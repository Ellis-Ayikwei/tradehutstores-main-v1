import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, MailCheck } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { ForgetPassword } from '../../store/authSlice';
import AuthLayout, { AuthError, AuthField, AuthSubmit } from './AuthLayout';

const backToSignIn = (
    <Link to="/login" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">
        <ArrowLeft size={16} aria-hidden />
        Back to sign in
    </Link>
);

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const dispatch = useDispatch<AppDispatch>();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
        setLoading(true);
        try {
            await dispatch(ForgetPassword({ email: email.trim() })).unwrap();
            setSent(true);
        } catch (err) {
            setError(err instanceof Error && err.message ? err.message : 'We could not send the reset link. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <AuthLayout title="Check your email" subtitle="The reset link is on its way." footer={backToSignIn}>
                <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900">
                    <MailCheck size={18} aria-hidden className="mt-0.5 shrink-0" />
                    <p>
                        If an account exists for <span className="break-all font-semibold">{email.trim()}</span>, it will receive a link to choose a new password. Check the spam folder if it
                        does not arrive within a few minutes.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="mt-4 flex h-12 w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-base font-semibold text-zinc-800 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                >
                    Use a different email
                </button>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title="Reset your password" subtitle="Enter your account email and we will send you a link to choose a new password." footer={backToSignIn}>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {error && <AuthError>{error}</AuthError>}
                <AuthField
                    label="Email"
                    type="email"
                    icon={Mail}
                    autoComplete="email"
                    inputMode="email"
                    autoFocus
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <AuthSubmit loading={loading} loadingLabel="Sending link...">
                    Send reset link
                </AuthSubmit>
            </form>
        </AuthLayout>
    );
}
