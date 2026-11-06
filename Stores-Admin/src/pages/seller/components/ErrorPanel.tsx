import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { cn } from '@/lib/utils';

interface ErrorPanelProps {
    title: string;
    message: string;
    onRetry?: () => void;
    isRetrying?: boolean;
    className?: string;
}

/** Inline error state with retry. Solid destructive-subtle surface (no alpha). */
export function ErrorPanel({ title, message, onRetry, isRetrying, className }: ErrorPanelProps) {
    return (
        <div role="alert" className={cn('flex flex-col gap-2 rounded-lg border border-destructive-subtle bg-destructive-subtle p-3 text-destructive-subtle-foreground sm:flex-row sm:items-center sm:justify-between', className)}>
            <div className="flex min-w-0 items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-sm">{message}</p>
                </div>
            </div>
            {onRetry ? (
                <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={isRetrying} className="shrink-0">
                    <RefreshCw className={cn(isRetrying && 'animate-spin')} aria-hidden="true" />
                    Retry
                </Button>
            ) : null}
        </div>
    );
}
