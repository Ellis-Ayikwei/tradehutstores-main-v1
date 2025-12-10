import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import i18next from 'i18next';
import themeConfig from '../theme.config';

export type ThemeMode = 'light' | 'dark' | 'system';
export type MenuMode = 'vertical' | 'collapsible-vertical' | 'horizontal';
export type LayoutMode = 'full' | 'boxed-layout';
export type RTLMode = 'rtl' | 'ltr';
export type NavbarMode = 'navbar-sticky' | 'navbar-floating' | 'navbar-static';
export type AnimationMode =
    | 'animate__fadeIn'
    | 'animate__fadeInDown'
    | 'animate__fadeInUp'
    | 'animate__fadeInLeft'
    | 'animate__fadeInRight'
    | 'animate__slideInDown'
    | 'animate__slideInLeft'
    | 'animate__slideInRight'
    | 'animate__zoomIn'
    | '';

interface Language {
    code: string;
    name: string;
}

interface ThemeState {
    isDarkMode: boolean;
    theme: ThemeMode;
    menu: MenuMode;
    layout: LayoutMode;
    rtlClass: RTLMode;
    animation: AnimationMode;
    navbar: NavbarMode;
    locale: string;
    sidebar: boolean;
    pageTitle: string;
    languageList: Language[];
    semidark: boolean;
    accentColor: string;
    fontSize: number;
}

const defaultState: ThemeState = {
    isDarkMode: false,
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
    ],
    semidark: false,
    accentColor: '#dc711a',
    fontSize: 16,
};

const getInitialTheme = (): ThemeMode => {
    const savedTheme = (localStorage.getItem('theme') as ThemeMode) || themeConfig.theme;
    if (savedTheme === 'system') {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return savedTheme;
};

const getInitialAnimation = (): AnimationMode => {
    const savedAnimation = localStorage.getItem('animation');
    if (savedAnimation && savedAnimation.startsWith('animate__')) {
        return savedAnimation as AnimationMode;
    }
    return '';
};

const initialState: ThemeState = {
    theme: getInitialTheme(),
    menu: (localStorage.getItem('menu') as MenuMode) || themeConfig.menu,
    layout: (localStorage.getItem('layout') as LayoutMode) || themeConfig.layout,
    rtlClass: (localStorage.getItem('rtlClass') as RTLMode) || themeConfig.rtlClass,
    animation: getInitialAnimation(),
    navbar: (localStorage.getItem('navbar') as NavbarMode) || themeConfig.navbar,
    locale: localStorage.getItem('i18nextLng') || themeConfig.locale,
    isDarkMode: getInitialTheme() === 'dark',
    sidebar: localStorage.getItem('sidebar') === 'true' || defaultState.sidebar,
    semidark: localStorage.getItem('semidark') === 'true' || themeConfig.semidark,
    languageList: defaultState.languageList,
    accentColor: localStorage.getItem('accentColor') || defaultState.accentColor,
    fontSize: Number(localStorage.getItem('fontSize')) || defaultState.fontSize,
    pageTitle: '',
};

const themeConfigSlice = createSlice({
    name: 'themeConfig',
    initialState,
    reducers: {
        toggleTheme(state, action: PayloadAction<ThemeMode>) {
            const payload = action.payload || state.theme;
            localStorage.setItem('theme', payload);
            state.theme = payload;

            if (payload === 'light') {
                state.isDarkMode = false;
            } else if (payload === 'dark') {
                state.isDarkMode = true;
            } else if (payload === 'system') {
                state.isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            }

            if (state.isDarkMode) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        },
        toggleMenu(state, action: PayloadAction<MenuMode>) {
            const payload = action.payload || state.menu;
            state.sidebar = false;
            localStorage.setItem('menu', payload);
            state.menu = payload;
        },
        toggleLayout(state, action: PayloadAction<LayoutMode>) {
            const payload = action.payload || state.layout;
            localStorage.setItem('layout', payload);
            state.layout = payload;
        },
        toggleRTL(state, action: PayloadAction<RTLMode>) {
            const payload = action.payload || state.rtlClass;
            localStorage.setItem('rtlClass', payload);
            state.rtlClass = payload;
            document.documentElement.setAttribute('dir', payload);
        },
        toggleAnimation(state, action: PayloadAction<AnimationMode>) {
            const payload = action.payload || state.animation;
            localStorage.setItem('animation', payload);
            state.animation = payload;
        },
        toggleNavbar(state, action: PayloadAction<NavbarMode>) {
            const payload = action.payload || state.navbar;
            localStorage.setItem('navbar', payload);
            state.navbar = payload;
        },
        toggleSemidark(state, action: PayloadAction<boolean>) {
            const payload = action.payload;
            localStorage.setItem('semidark', String(payload));
            state.semidark = payload;
        },
        toggleLocale(state, action: PayloadAction<string>) {
            const payload = action.payload || state.locale;
            i18next.changeLanguage(payload);
            state.locale = payload;
        },
        toggleSidebar(state) {
            state.sidebar = !state.sidebar;
        },
        setPageTitle(state, action: PayloadAction<string>) {
            state.pageTitle = action.payload;
            document.title = `${action.payload} | MoreVans`;
        },
        setAccentColor(state, action: PayloadAction<string>) {
            const payload = action.payload;
            localStorage.setItem('accentColor', payload);
            state.accentColor = payload;
            document.documentElement.style.setProperty('--accent-color', payload);
        },
        setFontSize(state, action: PayloadAction<number>) {
            const payload = action.payload;
            localStorage.setItem('fontSize', String(payload));
            state.fontSize = payload;
            document.documentElement.style.fontSize = `${payload}px`;
        },
    },
});

export const { toggleTheme, toggleMenu, toggleLayout, toggleRTL, toggleAnimation, toggleNavbar, toggleSemidark, toggleLocale, toggleSidebar, setPageTitle, setAccentColor, setFontSize } =
    themeConfigSlice.actions;

export default themeConfigSlice.reducer;
