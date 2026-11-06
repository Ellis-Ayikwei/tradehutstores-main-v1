'use client'

import { ClipboardList, FileCheck2, Store, Upload } from 'lucide-react'
import { useAuthModal } from '@/providers/AuthModalProvider'
import { primaryBtn, secondaryBtn } from '@/components/seller-onboarding/StatusScreens'

const STEPS = [
    { icon: ClipboardList, title: 'Tell us about your business', text: 'Business name, contact details and address.' },
    { icon: FileCheck2, title: 'Confirm your identity', text: 'A valid ID: Ghana Card, passport, driver’s licence or voter ID.' },
    { icon: Upload, title: 'Upload your documents', text: 'ID, proof of address, and business registration if you are a registered business.' },
    { icon: Store, title: 'Prepare your store', text: 'Set up your listings while we review. They go live once you are verified.' },
] as const

export default function SignedOutPitch() {
    const { openAuthModal } = useAuthModal()

    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-100">
                <Store className="h-6 w-6" aria-hidden />
            </span>
            <h1 className="mt-3 font-syne text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                Sell on TradeHut
            </h1>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 sm:text-base">
                Apply online to open a seller account. Our team reviews every application before a store goes live.
            </p>

            <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                {STEPS.map(({ icon: Icon, title, text }, i) => (
                    <li key={title} className="flex items-start gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-primary-700 dark:bg-gray-900">
                            <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="min-w-0">
                            <span className="block text-sm font-bold text-gray-900 dark:text-white">
                                {i + 1}. {title}
                            </span>
                            <span className="block text-xs text-gray-600 dark:text-gray-300">{text}</span>
                        </span>
                    </li>
                ))}
            </ol>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => openAuthModal('login')} className={primaryBtn}>
                    Sign in to apply
                </button>
                <button type="button" onClick={() => openAuthModal('signup')} className={secondaryBtn}>
                    Create an account
                </button>
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                You will stay on this page after signing in so you can continue your application.
            </p>
        </section>
    )
}
