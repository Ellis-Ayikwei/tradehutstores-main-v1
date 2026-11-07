import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
    'inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-primary-subtle [&>svg]:pointer-events-none [&>svg]:size-3',
    {
    variants: {
        variant: {
            default: 'bg-primary text-primary-foreground',
            secondary: 'bg-muted text-foreground',
            destructive: 'bg-destructive-subtle text-destructive-subtle-foreground',
            outline: 'border-border bg-muted text-foreground',
            success: 'bg-success-subtle text-success-subtle-foreground',
            warning: 'bg-warning-subtle text-warning-subtle-foreground',
            info: 'bg-info-subtle text-info-subtle-foreground',
        },
    },
    defaultVariants: {
        variant: 'default',
    },
    }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
    return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
