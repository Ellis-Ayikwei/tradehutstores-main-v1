'use client';

import { useTheme } from '../context/ThemeContext';

export default function Settings() {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold dark:text-white">Settings</h2>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="dark:text-white">Dark Mode</span>
                    <button onClick={toggleTheme} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-[#dc711a]' : 'bg-gray-200'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>

                {/* Add more settings options here */}
            </div>
        </div>
    );
}
