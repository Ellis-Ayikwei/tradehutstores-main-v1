import React from 'react';
import { Link } from 'react-router-dom';
import { Store, UserCog } from 'lucide-react';
import AuthLayout from './AuthLayout';

/**
 * This app has no self-service sign-up: staff accounts are created by an administrator and
 * sellers register on Seller Central. The page says so and points each to the right place.
 */
const Register: React.FC = () => (
    <AuthLayout
        title="Getting access"
        subtitle="Accounts for this dashboard are not created here."
        footer={
            <>
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-primary hover:underline">
                    Sign in
                </Link>
            </>
        }
    >
        <ul className="space-y-4">
            <li className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary-subtle-foreground">
                    <UserCog size={18} aria-hidden />
                </span>
                <div>
                    <p className="text-sm font-semibold text-zinc-900">TradeHut staff</p>
                    <p className="mt-0.5 text-sm text-zinc-600">Ask an administrator to create your account.</p>
                </div>
            </li>
            <li className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary-subtle-foreground">
                    <Store size={18} aria-hidden />
                </span>
                <div>
                    <p className="text-sm font-semibold text-zinc-900">Sellers</p>
                    <p className="mt-0.5 text-sm text-zinc-600">This dashboard is for staff. Open and manage your store on TradeHut Seller Central.</p>
                </div>
            </li>
        </ul>
    </AuthLayout>
);

export default Register;
