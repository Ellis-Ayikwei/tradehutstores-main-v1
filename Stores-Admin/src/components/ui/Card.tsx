interface CardProps {
    children: React.ReactNode;
    className?: string;
}

export function Card({ children, className = '' }: CardProps) {
    return <div className={`glass-morphism rounded-xl p-6 ${className}`}>{children}</div>;
}
