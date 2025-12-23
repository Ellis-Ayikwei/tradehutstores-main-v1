import { createSlice } from '@reduxjs/toolkit'
import i18next from 'i18next'
import themeConfig from '@/lib/theme.config'

const defaultState = {
    isDarkMode: false,
    mainLayout: 'app',
    theme: 'light',
    menu: 'vertical',
    layout: 'full',
    rtlClass: 'ltr',
    animation: '',
    navbar: 'navbar-sticky',
    locale: 'en',
    sidebar: false,
    pageTitle: '',
    languageList: [
        { code: 'zh', name: 'Chinese' },
        { code: 'da', name: 'Danish' },
        { code: 'en', name: 'English' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'el', name: 'Greek' },
        { code: 'hu', name: 'Hungarian' },
        { code: 'it', name: 'Italian' },
        { code: 'ja', name: 'Japanese' },
        { code: 'pl', name: 'Polish' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'ru', name: 'Russian' },
        { code: 'es', name: 'Spanish' },
        { code: 'sv', name: 'Swedish' },
        { code: 'tr', name: 'Turkish' },
        { code: 'ae', name: 'Arabic' },
    ],
    semidark: false,
}

const getInitialState = () => {
    if (typeof window === 'undefined') {
        return {
            ...defaultState,
            theme: themeConfig.theme,
            menu: themeConfig.menu,
            layout: themeConfig.layout,
            rtlClass: themeConfig.rtlClass,
            animation: themeConfig.animation,
            navbar: themeConfig.navbar,
            locale: themeConfig.locale,
            semidark: themeConfig.semidark,
        }
    }

    return {
        theme: localStorage.getItem('theme') || themeConfig.theme,
        menu: localStorage.getItem('menu') || themeConfig.menu,
        layout: localStorage.getItem('layout') || themeConfig.layout,
        rtlClass: localStorage.getItem('rtlClass') || themeConfig.rtlClass,
        animation: localStorage.getItem('animation') || themeConfig.animation,
        navbar: localStorage.getItem('navbar') || themeConfig.navbar,
        locale: localStorage.getItem('i18nextLng') || themeConfig.locale,
        isDarkMode: false,
        sidebar: localStorage.getItem('sidebar') || defaultState.sidebar,
        semidark: localStorage.getItem('semidark') || themeConfig.semidark,
        languageList: defaultState.languageList,
        pageTitle: '',
        mainLayout: 'app',
    }
}

const themeConfigSlice = createSlice({
    name: 'themeConfig',
    initialState: getInitialState(),
    reducers: {
        toggleTheme(state, { payload }) {
            payload = payload || state.theme
            if (typeof window !== 'undefined') {
                localStorage.setItem('theme', payload)
            }
            state.theme = payload
            if (payload === 'light') {
                state.isDarkMode = false
            } else if (payload === 'dark') {
                state.isDarkMode = true
            } else if (payload === 'system') {
                if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    state.isDarkMode = true
                } else {
                    state.isDarkMode = false
                }
            }

            if (typeof window !== 'undefined') {
                if (state.isDarkMode) {
                    document.querySelector('body')?.classList.add('dark')
                } else {
                    document.querySelector('body')?.classList.remove('dark')
                }
            }
        },
        toggleMenu(state, { payload }) {
            payload = payload || state.menu
            state.sidebar = false
            if (typeof window !== 'undefined') {
                localStorage.setItem('menu', payload)
            }
            state.menu = payload
        },
        toggleLayout(state, { payload }) {
            payload = payload || state.layout
            if (typeof window !== 'undefined') {
                localStorage.setItem('layout', payload)
            }
            state.layout = payload
        },
        toggleRTL(state, { payload }) {
            payload = payload || state.rtlClass
            if (typeof window !== 'undefined') {
                localStorage.setItem('rtlClass', payload)
                document.querySelector('html')?.setAttribute('dir', state.rtlClass || 'ltr')
            }
            state.rtlClass = payload
        },
        toggleAnimation(state, { payload }) {
            payload = payload || state.animation
            payload = payload?.trim()
            if (typeof window !== 'undefined') {
                localStorage.setItem('animation', payload)
            }
            state.animation = payload
        },
        toggleNavbar(state, { payload }) {
            payload = payload || state.navbar
            if (typeof window !== 'undefined') {
                localStorage.setItem('navbar', payload)
            }
            state.navbar = payload
        },
        toggleSemidark(state, { payload }) {
            payload = payload === true || payload === 'true' ? true : false
            if (typeof window !== 'undefined') {
                localStorage.setItem('semidark', payload.toString())
            }
            state.semidark = payload
        },
        toggleLocale(state, { payload }) {
            payload = payload || state.locale
            i18next.changeLanguage(payload)
            state.locale = payload
        },
        toggleSidebar(state) {
            state.sidebar = !state.sidebar
        },
        setPageTitle(state, { payload }) {
            if (typeof window !== 'undefined') {
                document.title = `${payload} | Next.js E-Commerce`
            }
            state.pageTitle = payload
        },
    },
})

export const { 
    toggleTheme, 
    toggleMenu, 
    toggleLayout, 
    toggleRTL, 
    toggleAnimation, 
    toggleNavbar, 
    toggleSemidark, 
    toggleLocale, 
    toggleSidebar, 
    setPageTitle 
} = themeConfigSlice.actions

export default themeConfigSlice.reducer