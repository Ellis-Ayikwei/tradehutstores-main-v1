/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'class',
    theme: {
        container: {
            center: true,
        },
        extend: {
            colors: {
                // Core brand colors with standard Tailwind scale
                primary: {
                    50: '#fef4ee', // Lightest tint
                    100: '#fde6d4', // Very light
                    200: '#f9c89c', // Light
                    300: '#f5a96d', // Medium light
                    400: '#f18137', // Medium
                    500: '#dc711a', // DEFAULT - TradeHut Orange
                    600: '#c45811', // Darker
                    700: '#a34311', // Dark
                    800: '#853614', // Very dark
                    900: '#6d2e15', // Darkest
                    DEFAULT: '#dc711a',
                    light: '#fde6d4',
                    'dark-light': 'rgba(220, 113, 26, 0.15)',
                },
                secondary: {
                    50: '#f7f7f7', // Lightest charcoal gray
                    100: '#e8e8e8', // Very light charcoal
                    200: '#d1d1d1', // Light charcoal gray
                    300: '#a8a8a8', // Medium light charcoal
                    400: '#7a7a7a', // Medium charcoal
                    500: '#4a4a4a', // DEFAULT - Charcoal black
                    600: '#3a3a3a', // Dark charcoal
                    700: '#2a2a2a', // Darker charcoal
                    800: '#1a1a1a', // Very dark charcoal
                    900: '#0a0a0a', // Deep charcoal black
                    DEFAULT: '#4a4a4a',
                    light: '#e8e8e8',
                    'dark-light': 'rgba(74, 74, 74, 0.15)',
                },

                // Semantic colors with full scales
                success: {
                    50: '#f0fdf4',
                    100: '#dcfce7',
                    200: '#bbf7d0',
                    300: '#86efac',
                    400: '#4ade80',
                    500: '#22c55e', // Green for success
                    600: '#16a34a',
                    700: '#15803d',
                    800: '#166534',
                    900: '#14532d',
                    DEFAULT: '#22c55e',
                    light: '#dcfce7',
                    'dark-light': 'rgba(34, 197, 94, 0.15)',
                },
                danger: {
                    50: '#fef2f2',
                    100: '#fee2e2',
                    200: '#fecaca',
                    300: '#fca5a5',
                    400: '#f87171',
                    500: '#D32F2F', // Error red
                    600: '#b91c1c',
                    700: '#991b1b',
                    800: '#7f1d1d',
                    900: '#651616',
                    DEFAULT: '#D32F2F',
                    light: '#fee2e2',
                    'dark-light': 'rgba(211, 47, 47, 0.15)',
                },
                warning: {
                    50: '#fff5f2',
                    100: '#fff0e6',
                    200: '#ffd5c7',
                    300: '#ffb59e',
                    400: '#ff8d67',
                    500: '#FF6B35', // Secondary = alerts
                    600: '#e5522a',
                    700: '#cc3e1f',
                    800: '#b32b14',
                    900: '#99180a',
                    DEFAULT: '#FF6B35',
                    light: '#fff0e6',
                    'dark-light': 'rgba(255, 107, 53, 0.15)',
                },
                info: {
                    50: '#e3f2fd',
                    100: '#bbdefb',
                    200: '#90caf9',
                    300: '#64b5f6',
                    400: '#42a5f5',
                    500: '#2196F3', // Blue for info
                    600: '#1e88e5',
                    700: '#1976d2',
                    800: '#1565c0',
                    900: '#0d47a1',
                    DEFAULT: '#2196F3',
                    light: '#e3f2fd',
                    'dark-light': 'rgba(33, 150, 243, 0.15)',
                },

                // Neutrals (from design system)
                dark: {
                    50: '#f9f9f9',
                    100: '#f4f4f4',
                    200: '#e9e9e9',
                    300: '#d1d1d1',
                    400: '#a3a3a3',
                    500: '#6D6D6D', // Secondary text
                    600: '#525252',
                    700: '#404040',
                    800: '#2D2D2D', // Body text
                    900: '#171717',
                    DEFAULT: '#2D2D2D',
                    light: '#6D6D6D',
                    'dark-light': 'rgba(45, 45, 45, 0.15)',
                },
                black: {
                    50: '#f7f8fa',
                    100: '#e8eaf6',
                    200: '#d1d4ed',
                    300: '#a3a9d9',
                    400: '#7575c0',
                    500: '#2D2D2D', // Dark gray
                    600: '#252060',
                    700: '#1c1849',
                    800: '#131132',
                    900: '#0e1726', // Deep dark
                    DEFAULT: '#0e1726',
                    light: '#2D2D2D',
                    'dark-light': 'rgba(14, 23, 38, 0.15)',
                },
                white: {
                    50: '#ffffff',
                    100: '#fefefe',
                    200: '#fdfdfd',
                    300: '#fcfcfc',
                    400: '#fafafa',
                    500: '#f8f8f8',
                    600: '#F4F4F4', // Backgrounds
                    700: '#e5e5e5',
                    800: '#6D6D6D', // Borders
                    900: '#525252',
                    DEFAULT: '#FFFFFF',
                    light: '#F4F4F4',
                    dark: '#6D6D6D',
                },
            },
            fontFamily: {
                sans: ['Charlie', 'sans-serif'], // Charlie as default font
                Charlie: ['Charlie', 'sans-serif'],
            },
            spacing: {
                4.5: '18px',
            },
            boxShadow: {
                '3xl': '0 2px 2px rgba(220, 113, 26, 0.05), 1px 6px 7px rgba(220, 113, 26, 0.1)', // TradeHut Orange-tinted
                urgent: '0 4px 14px -2px rgba(220, 113, 26, 0.25)', // TradeHut Orange shadow
            },
            typography: ({ theme }) => ({
                DEFAULT: {
                    css: {
                        '--tw-prose-invert-headings': theme('colors.white'),
                        '--tw-prose-invert-links': theme('colors.secondary.DEFAULT'),
                        h1: { fontSize: '40px', color: theme('colors.primary.DEFAULT') },
                        h2: { fontSize: '32px', color: theme('colors.primary.DEFAULT') },
                        h3: { fontSize: '28px', color: theme('colors.primary.DEFAULT') },
                        a: {
                            color: theme('colors.secondary.DEFAULT'),
                            '&:hover': { color: theme('colors.secondary.DEFAULT') },
                        },
                    },
                },
            }),
        },
    },
    variants: {
        opacity: ({ after }) => after(['disabled']),
    },
    plugins: [
        require('@tailwindcss/forms')({
            strategy: 'class',
        }),
        require('@tailwindcss/typography'),
    ],
};
