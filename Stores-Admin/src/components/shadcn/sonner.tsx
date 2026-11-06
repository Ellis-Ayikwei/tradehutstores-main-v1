import { useEffect, useState } from 'react';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

// The admin toggles `html.dark` (see store/themeConfigSlice), so follow that instead of next-themes.
const useHtmlTheme = (): 'light' | 'dark' => {
    const read = () => (typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    const [theme, setTheme] = useState<'light' | 'dark'>(read);

    useEffect(() => {
        const observer = new MutationObserver(() => setTheme(read()));
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    return theme;
};

const Toaster = ({ ...props }: ToasterProps) => {
    const theme = useHtmlTheme();

    return (
        <Sonner
            theme={theme}
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
                    description: 'group-[.toast]:text-muted-foreground',
                    actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
                    cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
                },
            }}
            {...props}
        />
    );
};

export { Toaster };
export { toast } from 'sonner';
