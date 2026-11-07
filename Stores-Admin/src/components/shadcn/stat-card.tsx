import * as React from 'react';
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/shadcn/card';
import { Skeleton } from '@/components/shadcn/skeleton';

export interface StatCardProps {
    label: string;
    value: React.ReactNode;
    icon?: LucideIcon;
    /** Percentage change; positive renders green, negative red. */
    trend?: { value: number; label?: string };
    hint?: string;
    isLoading?: boolean;
    className?: string;
}

export function StatCard({ label, value, icon: Icon, trend, hint, isLoading, className }: StatCardProps) {
    const positive = trend ? trend.value >= 0 : true;
    const TrendIcon = positive ? ArrowUpRight : ArrowDownRight;

    return (
        <Card className={className}>
            <CardContent className="flex items-start justify-between gap-3 p-4 pt-4 sm:p-5 sm:pt-5">
                <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{label}</p>
                    {isLoading ? <Skeleton className="h-8 w-24" /> : <p className="truncate text-2xl font-bold tracking-tight text-foreground">{value}</p>}
                    {isLoading ? (
                        <Skeleton className="h-4 w-32" />
                    ) : trend || hint ? (
                        <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                            {trend ? (
                                <span className={cn('inline-flex items-center font-semibold', positive ? 'text-success-600' : 'text-destructive')}>
                                    <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                    {Math.abs(trend.value).toFixed(1)}%
                                </span>
                            ) : null}
                            {trend?.label ? <span>{trend.label}</span> : null}
                            {hint ? <span>{hint}</span> : null}
                        </p>
                    ) : null}
                </div>
                {Icon ? (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-subtle text-primary-subtle-foreground">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}
