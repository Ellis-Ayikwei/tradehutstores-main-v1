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
    accentColor: '#dc711a', // TradeHut Orange
    fontSize: 16,
};

/** Persisted choice: light | dark | follow OS (`system`). */
function readStoredThemeMode(): ThemeMode {
    if (typeof window === 'undefined') return themeConfig.theme as ThemeMode;
    return ((localStorage.getItem('theme') as ThemeMode) || themeConfig.theme) as ThemeMode;
}

/** Resolved presentation for Tailwind `dark:` — uses OS preference when mode is `system`. */
export function resolveIsDark(mode: ThemeMode): boolean {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    if (typeof window === 'undefined') return false;
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function syncHtmlDarkClass(isDark: boolean): void {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', isDark);
}

const getInitialAnimation = (): AnimationMode => {
    if (typeof window === 'undefined') return '';
    const savedAnimation = localStorage.getItem('animation');
    if (savedAnimation && savedAnimation.startsWith('animate__')) {
        return savedAnimation as AnimationMode;
    }
    return '';
};

const savedThemeMode = readStoredThemeMode();

const initialState: ThemeState = {
    theme: savedThemeMode,
    menu: (typeof window !== 'undefined' && (localStorage.getItem('menu') as MenuMode)) || themeConfig.menu,
    layout: (typeof window !== 'undefined' && (localStorage.getItem('layout') as LayoutMode)) || themeConfig.layout,
    rtlClass: (typeof window !== 'undefined' && (localStorage.getItem('rtlClass') as RTLMode)) || themeConfig.rtlClass,
    animation: getInitialAnimation(),
    navbar: (typeof window !== 'undefined' && (localStorage.getItem('navbar') as NavbarMode)) || themeConfig.navbar,
    locale: (typeof window !== 'undefined' && localStorage.getItem('i18nextLng')) || themeConfig.locale,
    isDarkMode: resolveIsDark(savedThemeMode),
    sidebar:
        (typeof window !== 'undefined' && localStorage.getItem('sidebar') === 'true') || defaultState.sidebar,
    semidark:
        (typeof window !== 'undefined' && localStorage.getItem('semidark') === 'true') || themeConfig.semidark,
    languageList: defaultState.languageList,
    accentColor:
        (typeof window !== 'undefined' && localStorage.getItem('accentColor')) || defaultState.accentColor,
    fontSize:
        (typeof window !== 'undefined' && Number(localStorage.getItem('fontSize'))) || defaultState.fontSize,
    pageTitle: '',
};

/* Before React paints: align `html.dark` with persisted theme (fixes light flash on refresh). */
if (typeof window !== 'undefined') {
    syncHtmlDarkClass(resolveIsDark(savedThemeMode));
}

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

            syncHtmlDarkClass(state.isDarkMode);
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
            document.title = `${action.payload} | TradeHut`;
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
