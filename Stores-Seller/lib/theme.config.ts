const themeConfig = {
    locale: 'en',
    theme: 'light',
    menu: 'vertical',
    layout: 'full',
    rtlClass: 'ltr',
    animation: '',
    navbar: 'navbar-sticky',
    semidark: false,
}

export default themeConfig

/**
 * Theme contract (single source of truth, see AGENTS.md section 5 "Theme boot").
 * - localStorage key `theme` holds 'light' | 'dark' | 'system'.
 * - Nothing stored => LIGHT. The OS preference is only consulted when the stored value is 'system'.
 * - The resolved mode is a class (`dark` or `light`) on <html> plus `style.colorScheme`.
 */
export const THEME_STORAGE_KEY = 'theme'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_COLOR_LIGHT = '#ffffff'
export const THEME_COLOR_DARK = '#09090b'

export function readStoredPreference(): ThemePreference {
    try {
        const v = localStorage.getItem(THEME_STORAGE_KEY)
        if (v === 'dark' || v === 'system') return v
    } catch {
        /* storage unavailable */
    }
    return 'light'
}

export function resolvePreference(pref: ThemePreference): ResolvedTheme {
    if (pref === 'dark') return 'dark'
    if (pref === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark'
    }
    return 'light'
}

/** Synchronously applies the resolved theme to <html> (the only element that carries the class). */
export function applyResolvedTheme(mode: ResolvedTheme): void {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(mode)
    root.style.colorScheme = mode
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', mode === 'dark' ? THEME_COLOR_DARK : THEME_COLOR_LIGHT)
}

/** Reads the mode the boot script already applied; falls back to light on the server. */
export function readDomTheme(): ResolvedTheme {
    if (typeof document === 'undefined') return 'light'
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/**
 * Tiny blocking script inlined in <head>. Runs before first paint. Defaults to light.
 * Keep in sync with applyResolvedTheme above.
 */
export const THEME_BOOT_SCRIPT =
    "(function(){var m='light';try{var t=localStorage.getItem('" +
    THEME_STORAGE_KEY +
    "');if(t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches))m='dark'}catch(e){}" +
    "var d=document.documentElement;d.classList.remove('light','dark');d.classList.add(m);d.style.colorScheme=m;" +
    "var c=document.querySelector('meta[name=\"theme-color\"]');if(c)c.setAttribute('content',m==='dark'?'" +
    THEME_COLOR_DARK +
    "':'" +
    THEME_COLOR_LIGHT +
    "')})();"
