interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline';
    size?: 'sm' | 'md' | 'lg';
}

export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2';

    const variants = {
        primary: 'bg-gradient-to-r from-primary-500 to-primary-400 text-white hover:from-primary-600 hover:to-primary-500 focus:ring-primary-500',
        secondary: 'bg-white dark:bg-crypto-card text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-crypto-border focus:ring-primary-500',
        outline: 'border-2 border-primary-500 text-primary-500 hover:bg-primary-50 dark:hover:bg-crypto-border focus:ring-primary-500',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
    };

    return (
        <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
            {children}
        </button>
    );
}
