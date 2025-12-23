import { PropsWithChildren, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import store, { AppDispatch, IRootState } from './store';
import { toggleAnimation, toggleLayout, toggleLocale, toggleMenu, toggleNavbar, toggleRTL, toggleSemidark, toggleTheme } from './store/themeConfigSlice';
import DraftRequestsModal from './components/DraftRequestsModal';
import useAuthUser from 'react-auth-kit/hooks/useAuthUser';
import { fetchDrafts } from './store/slices/draftRequestsSlice';

interface AuthUser {
    user: {
        id: string;
    };
}

function App({ children }: PropsWithChildren) {
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const dispatch = useDispatch<AppDispatch>();
    const authUser = useAuthUser();
    const user = authUser as AuthUser | null;
    const drafts = useSelector((state: IRootState) => state.draftRequests.drafts);

    useEffect(() => {
        dispatch(toggleTheme((localStorage.getItem('theme') as any) || themeConfig.theme));
        dispatch(toggleMenu((localStorage.getItem('menu') as any) || themeConfig.menu));
        dispatch(toggleLayout((localStorage.getItem('layout') as any) || themeConfig.layout));
        dispatch(toggleRTL((localStorage.getItem('rtlClass') as any) || themeConfig.rtlClass));
        dispatch(toggleAnimation((localStorage.getItem('animation') as any) || themeConfig.animation));
        dispatch(toggleNavbar((localStorage.getItem('navbar') as any) || themeConfig.navbar));
        dispatch(toggleLocale(localStorage.getItem('i18nextLng') || themeConfig.locale));
        dispatch(toggleSemidark(localStorage.getItem('semidark') === 'true' || themeConfig.semidark));

     

       
    }, [dispatch, themeConfig.theme, themeConfig.menu, themeConfig.layout, themeConfig.rtlClass, themeConfig.animation, themeConfig.navbar, themeConfig.locale, themeConfig.semidark, drafts]);

    return (
        <div
            className={`${(store.getState().themeConfig.sidebar && 'toggle-sidebar') || ''} ${themeConfig.menu} ${themeConfig.layout} ${
                themeConfig.rtlClass
            } main-section antialiased relative font-nunito text-sm font-normal`}
        >
            {children}
        </div>
    );
}

export default App;
