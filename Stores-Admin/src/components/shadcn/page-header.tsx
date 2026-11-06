import * as React from 'react';

import { cn } from '@/lib/utils';

export interface PageHeaderProps {
    title: string;
    description?: string;
    /** Buttons / filters aligned right on >= sm, stacked full-width below the title on mobile. */
    actions?: React.ReactNode;
    className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
    return (
        <div className={cn('flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between', className)}>
            <div className="min-w-0 space-y-1">
                <h1 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
                {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div> : null}
        </div>
    );
}
