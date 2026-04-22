/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        container: {
            center: true,
            padding: {
                DEFAULT: '1rem',
                sm: '1.5rem',
                lg: '2rem',
                xl: '2.5rem',
                '2xl': '2rem',
            },
            screens: {
                '2xl': '1440px',
            },
        },
        screens: {
            xs: '480px',
            sm: '640px',
            md: '768px',
            lg: '1024px',
            xl: '1280px',
            '2xl': '1536px',
        },
        extend: {
            colors: {
                // ── Brand Core ──
                primary: {
                    DEFAULT: '#F5620F',
                    light: '#FF8040',
                    dim: '#FFF0E8',
                    50:  '#fff4ee',
                    100: '#ffe6d4',
                    200: '#ffc89c',
                    300: '#ffa96d',
                    400: '#ff8140',
                    500: '#F5620F',  // DEFAULT
                    600: '#d44e0a',
                    700: '#b03c07',
                    800: '#8c2e06',
                    900: '#6d2205',
                },

                // ── Auction / Bidding ──
                bid: {
                    green:  '#00C48C',
                    red:    '#FF4757',
                    amber:  '#FFB800',
                    'green-bg': 'rgba(0, 196, 140, 0.12)',
                    'red-bg':   'rgba(255, 71, 87, 0.12)',
                    'amber-bg': 'rgba(255, 184, 0, 0.12)',
                },

                // ── Reverse Marketplace ──
                request: {
                    DEFAULT: '#2979FF',
                    bg:     '#EBF2FF',
                    dark:   '#1A56CC',
                },

                // ── Neutrals ──
                gray: {
                    50:  '#FAFBFC',
                    100: '#F7F8FA',
                    200: '#ECEEF2',
                    300: '#D8DCE5',
                    400: '#B0B8C8',
                    500: '#7E899B',
                    600: '#5A6478',
                    700: '#2E3347',
                    800: '#1E2230',
                    900: '#141720',
                    950: '#0D0F12',
                },

                // ── Semantic ──
                success: {
                    DEFAULT: '#00B96B',
                    light:   '#E6FAF2',
                    'dark-light': 'rgba(0, 185, 107, 0.15)',
                },
                danger: {
                    DEFAULT: '#FF3B30',
                    light:   '#FFF0EF',
                    'dark-light': 'rgba(255, 59, 48, 0.15)',
                },
                warning: {
                    DEFAULT: '#FF9500',
                    light:   '#FFF8EB',
                    'dark-light': 'rgba(255, 149, 0, 0.15)',
                },
                info: {
                    DEFAULT: '#0A84FF',
                    light:   '#E5F3FF',
                    'dark-light': 'rgba(10, 132, 255, 0.15)',
                },

                // ── Legacy aliases (keep for backward compat) ──
                secondary: {
                    DEFAULT: '#805dca',
                    light: '#ebe4f7',
                    'dark-light': 'rgb(128 93 202 / 15%)',
                },
                dark: {
                    DEFAULT: '#3b3f5c',
                    light: '#eaeaec',
                    'dark-light': 'rgba(59,63,92,.15)',
                },
                black: {
                    DEFAULT: '#0e1726',
                    light: '#e3e4eb',
                    'dark-light': 'rgba(14,23,38,.15)',
                },
                white: {
                    DEFAULT: '#ffffff',
                    light: '#e0e6ed',
                    dark: '#888ea8',
                },

                // ── Glass / Frosted ──
                glass: {
                    light: 'rgba(255, 255, 255, 0.08)',
                    dark:  'rgba(0, 0, 0, 0.20)',
                    border: 'rgba(255, 255, 255, 0.12)',
                },
            },

            fontFamily: {
                display: ['Syne', 'sans-serif'],
                body:    ['DM Sans', 'sans-serif'],
                mono:    ['JetBrains Mono', 'monospace'],
                // legacy
                nunito:  ['Nunito', 'sans-serif'],
            },

            fontSize: {
                '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
            },

            spacing: {
                4.5: '18px',
                13:  '52px',
                15:  '60px',
                18:  '72px',
            },

            borderRadius: {
                sm:   '4px',
                DEFAULT: '8px',
                md:   '8px',
                lg:   '12px',
                xl:   '16px',
                '2xl':'24px',
                '3xl':'32px',
            },

            boxShadow: {
                // Brand glow
                'glow-sm': '0 0 10px rgba(245, 98, 15, 0.40)',
                glow:      '0 0 15px rgba(245, 98, 15, 0.45)',
                'glow-lg': '0 0 25px rgba(245, 98, 15, 0.50)',

                // Bid states
                'bid-win':  '0 0 0 2px #00C48C, 0 4px 16px rgba(0,196,140,0.25)',
                'bid-lose': '0 0 0 2px #FF4757, 0 4px 16px rgba(255,71,87,0.20)',

                // Elevation
                sm:  '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                md:  '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
                lg:  '0 10px 32px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)',
                xl:  '0 20px 48px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.08)',

                // Glass
                glass: '0 8px 32px 0 rgba(31, 38, 135, 0.20)',

                // Card hover
                card:       '0 4px 12px rgba(0,0,0,0.08)',
                'card-hover':'0 12px 32px rgba(0,0,0,0.14)',
            },

            backdropBlur: {
                glass: '12px',
                xs:    '4px',
            },

            backgroundImage: {
                'gradient-radial':  'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic':   'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
                'grid-pattern':     "url('/assets/grid-pattern.svg')",
                'noise':            "url('/assets/noise.png')",
                // Brand gradients
                'primary-gradient': 'linear-gradient(135deg, #F5620F 0%, #FF8040 100%)',
                'bid-gradient':     'linear-gradient(135deg, #00C48C 0%, #00E5A5 100%)',
                'request-gradient': 'linear-gradient(135deg, #2979FF 0%, #5B9EFF 100%)',
                'dark-gradient':    'linear-gradient(180deg, #141720 0%, #0D0F12 100%)',
            },

            animation: {
                // Brand
                'glow':         'glow 2s ease-in-out infinite alternate',
                'float':        'float 3s ease-in-out infinite',
                'gradient-x':   'gradient-x 15s ease infinite',
                'gradient-y':   'gradient-y 15s ease infinite',
                'gradient-xy':  'gradient-xy 15s ease infinite',

                // Commerce-specific
                'pulse-bid':    'pulse-bid 1.5s ease-in-out infinite',
                'ticker':       'ticker 0.3s ease-out',
                'slide-in':     'slide-in 0.25s ease-out',
                'fade-up':      'fade-up 0.35s ease-out',
                'shimmer':      'shimmer 1.8s linear infinite',
                'count-down':   'count-down 1s steps(1) infinite',
            },

            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%':      { transform: 'translateY(-10px)' },
                },
                glow: {
                    from: { boxShadow: '0 0 10px #F5620F, 0 0 20px #F5620F' },
                    to:   { boxShadow: '0 0 20px #F5620F, 0 0 40px #F5620F' },
                },
                'gradient-y': {
                    '0%, 100%': { backgroundSize: '400% 400%', backgroundPosition: 'center top' },
                    '50%':      { backgroundSize: '200% 200%', backgroundPosition: 'center center' },
                },
                'pulse-bid': {
                    '0%, 100%': { boxShadow: '0 0 0 0 rgba(0, 196, 140, 0.6)' },
                    '50%':      { boxShadow: '0 0 0 8px rgba(0, 196, 140, 0)' },
                },
                ticker: {
                    '0%':   { transform: 'translateY(8px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)',   opacity: '1' },
                },
                'slide-in': {
                    '0%':   { transform: 'translateX(-12px)', opacity: '0' },
                    '100%': { transform: 'translateX(0)',      opacity: '1' },
                },
                'fade-up': {
                    '0%':   { transform: 'translateY(16px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)',    opacity: '1' },
                },
                shimmer: {
                    '0%':   { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition:  '200% 0' },
                },
                'count-down': {
                    '0%, 100%': { opacity: '1' },
                    '50%':      { opacity: '0.5' },
                },
            },

            transitionTimingFunction: {
                'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
            },

            transitionDuration: {
                '0':   '0ms',
                '150': '150ms',
                '250': '250ms',
            },

            zIndex: {
                '60': '60',
                '70': '70',
                '80': '80',
                '90': '90',
                modal:    '100',
                toast:    '110',
                tooltip:  '120',
            },

            typography: ({ theme }) => ({
                DEFAULT: {
                    css: {
                        '--tw-prose-invert-headings': theme('colors.white.dark'),
                        '--tw-prose-invert-links':    theme('colors.white.dark'),
                        fontFamily: theme('fontFamily.body').join(', '),
                        h1: { fontSize: '40px', fontFamily: theme('fontFamily.display').join(', '), marginBottom: '0.5rem', marginTop: 0 },
                        h2: { fontSize: '32px', fontFamily: theme('fontFamily.display').join(', '), marginBottom: '0.5rem', marginTop: 0 },
                        h3: { fontSize: '28px', fontFamily: theme('fontFamily.display').join(', '), marginBottom: '0.5rem', marginTop: 0 },
                        h4: { fontSize: '24px', marginBottom: '0.5rem', marginTop: 0 },
                        h5: { fontSize: '20px', marginBottom: '0.5rem', marginTop: 0 },
                        h6: { fontSize: '16px', marginBottom: '0.5rem', marginTop: 0 },
                        p:  { marginBottom: '0.5rem' },
                        li: { margin: 0 },
                        img:{ margin: 0 },
                    },
                },
            }),
        },
    },
    plugins: [
        require('@tailwindcss/forms')({ strategy: 'class' }),
        require('@tailwindcss/typography'),
    ],
}