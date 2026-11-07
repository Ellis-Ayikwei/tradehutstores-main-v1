import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
    // base-maia: pill shape, medium weight, soft 3px focus halo, press nudge. Solid surfaces only (docs/ui-system.md).
    'inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-4xl border border-transparent text-sm font-medium transition-all focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-primary-subtle active:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-[invalid=true]:border-destructive [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
                destructive: 'bg-destructive-subtle text-destructive-subtle-foreground hover:bg-destructive hover:text-destructive-foreground focus-visible:border-destructive focus-visible:ring-destructive-subtle',
                outline: 'border-border bg-muted text-foreground hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent',
                // Legacy `secondary` is a charcoal brand color, so the subtle shadcn "secondary" maps to `muted`.
                secondary: 'bg-muted text-foreground hover:bg-accent data-[state=open]:bg-accent',
                ghost: 'hover:bg-muted hover:text-foreground data-[state=open]:bg-muted',
                link: 'text-primary underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-9 px-3.5',
                xs: 'h-6 gap-1 px-2.5 text-xs [&_svg]:size-3',
                sm: 'h-8 gap-1 px-3',
                lg: 'h-10 px-5',
                icon: 'h-9 w-9',
                'icon-xs': 'h-6 w-6 [&_svg]:size-3',
                'icon-sm': 'h-8 w-8',
                'icon-lg': 'h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = 'Button';

export { Button, buttonVariants };
