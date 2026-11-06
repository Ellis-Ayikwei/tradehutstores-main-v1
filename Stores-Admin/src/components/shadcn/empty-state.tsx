import * as React from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    /** Usually a <Button>. */
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center gap-3 px-4 py-12 text-center', className)}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
                <p className="text-base font-semibold text-foreground">{title}</p>
                {description ? <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p> : null}
            </div>
            {action ? <div className="mt-1">{action}</div> : null}
        </div>
    );
}
