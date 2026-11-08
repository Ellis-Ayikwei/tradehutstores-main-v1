/**
 * Theme bridge for the legacy UI kits (antd, Mantine) still used by unmigrated pages.
 * Mirrors the shadcn preset `bbVJxYW` (base-maia, neutral) tokens in src/tailwind.css so
 * legacy screens match the shadcn ones until they are migrated (docs/ui-system.md).
 * Delete together with the last antd / Mantine page.
 */
import React from 'react';
import { useSelector } from 'react-redux';
// Deep imports: the stale `@types/antd@0.12` devDependency shadows antd 5's own root typings.
import ConfigProvider from 'antd/es/config-provider';
import antdTheme from 'antd/es/theme';
import { createTheme, type MantineColorsTuple } from '@mantine/core';

const FONT = "'Charlie', sans-serif";

/** TradeHut orange scale (same values as tailwind.config.cjs `primary-50..900`). */
const brand: MantineColorsTuple = ['#fef4ee', '#fde6d4', '#f9c89c', '#f5a96d', '#f18137', '#dc711a', '#c45811', '#a34311', '#853614', '#6d2e15'];

export const mantineTheme = createTheme({
    primaryColor: 'brand',
    primaryShade: 5,
    colors: { brand },
    fontFamily: FONT,
    headings: { fontFamily: FONT, fontWeight: '600' },
    // --radius: 0.625rem → sm 0.6x, md 0.8x, lg 1x, xl 1.6x (cards), pills via defaultRadius on controls.
    radius: { xs: '6px', sm: '8px', md: '10px', lg: '16px', xl: '26px' },
    defaultRadius: 'md',
    components: {
        Button: { defaultProps: { radius: 'xl' } },
        ActionIcon: { defaultProps: { radius: 'xl' } },
        TextInput: { defaultProps: { radius: 'xl' } },
        PasswordInput: { defaultProps: { radius: 'xl' } },
        NumberInput: { defaultProps: { radius: 'xl' } },
        Select: { defaultProps: { radius: 'xl' } },
        MultiSelect: { defaultProps: { radius: 'lg' } },
        Badge: { defaultProps: { radius: 'xl' } },
        Card: { defaultProps: { radius: 'lg', withBorder: true, shadow: 'none' } },
        Paper: { defaultProps: { radius: 'lg' } },
        Modal: { defaultProps: { radius: 'xl' } },
        Menu: { defaultProps: { radius: 'lg', shadow: 'xl' } },
        Popover: { defaultProps: { radius: 'lg', shadow: 'xl' } },
    },
});

interface ThemeState {
    themeConfig: { isDarkMode: boolean };
}

/** antd theme that follows the html.dark toggle (store/themeConfigSlice). Must sit inside the redux Provider. */
export function AntdThemeBridge({ children }: { children: React.ReactNode }) {
    const isDark = useSelector((state: ThemeState) => state.themeConfig.isDarkMode);

    return (
        <ConfigProvider
            theme={{
                algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
                token: {
                    colorPrimary: '#dc711a',
                    colorLink: '#dc711a',
                    colorError: '#d63b3b',
                    fontFamily: FONT,
                    borderRadius: 10,
                    borderRadiusSM: 8,
                    borderRadiusLG: 16,
                    controlHeight: 36,
                    wireframe: false,
                    ...(isDark ? {} : { colorBorder: '#e5e5e5', colorBorderSecondary: '#ededed', colorText: '#0a0a0a', colorTextSecondary: '#737373' }),
                },
                components: {
                    Button: { borderRadius: 999, borderRadiusLG: 999, borderRadiusSM: 999, primaryShadow: 'none', defaultShadow: 'none', dangerShadow: 'none', fontWeight: 500 },
                    Input: { activeShadow: '0 0 0 3px #fde6d4' },
                    Select: { optionSelectedBg: isDark ? undefined : '#f5f5f5' },
                    Card: { borderRadiusLG: 16 },
                    Modal: { borderRadiusLG: 26 },
                    Table: { borderRadiusLG: 16, headerBg: isDark ? undefined : '#f5f5f5', headerSplitColor: 'transparent' },
                    Tag: { borderRadiusSM: 999 },
                    Tabs: { inkBarColor: '#dc711a' },
                },
            }}
        >
            {children}
        </ConfigProvider>
    );
}
