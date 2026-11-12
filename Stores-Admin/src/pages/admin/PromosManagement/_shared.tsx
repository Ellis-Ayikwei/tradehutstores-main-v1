import React from 'react';
import { Building2, Gift, Percent, Receipt, ShoppingCart, Truck, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/shadcn/badge';
import { Label } from '@/components/shadcn/label';
import { cn } from '@/lib/utils';
import type { DiscountType, PromoCode } from '@/services/promosAdminService';

export const Field: React.FC<{ label: string; hint?: string; htmlFor?: string; className?: string; children: React.ReactNode }> = ({
    label,
    hint,
    htmlFor,
    className,
    children,
}) => (
    <div className={cn('space-y-1.5', className)}>
        <Label htmlFor={htmlFor}>{label}</Label>
        {children}
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
);

export const Alert: React.FC<{ tone?: 'error' | 'info' | 'warn'; children: React.ReactNode }> = ({ tone = 'error', children }) => {
    const cls =
        tone === 'error'
            ? 'bg-destructive-subtle text-destructive-subtle-foreground'
            : tone === 'warn'
              ? 'bg-warning-subtle text-warning-subtle-foreground'
              : 'bg-info-subtle text-info-subtle-foreground';
    return (
        <div role="alert" className={cn('rounded-xl px-4 py-3 text-sm', cls)}>
            {children}
        </div>
    );
};

export const DISCOUNT_ICONS: Record<DiscountType, LucideIcon> = {
    percentage: Percent,
    fixed_amount: Receipt,
    free_shipping: Truck,
    buy_x_get_y: Gift,
    fixed_price: ShoppingCart,
};

const DISCOUNT_VARIANT: Record<DiscountType, 'default' | 'info' | 'success' | 'warning' | 'secondary'> = {
    percentage: 'default',
    fixed_amount: 'info',
    free_shipping: 'success',
    buy_x_get_y: 'warning',
    fixed_price: 'secondary',
};

export const DiscountBadge: React.FC<{ promo: PromoCode }> = ({ promo }) => {
    const Icon = DISCOUNT_ICONS[promo.discount_type] || Percent;
    return (
        <Badge variant={DISCOUNT_VARIANT[promo.discount_type] ?? 'default'}>
            <Icon aria-hidden="true" />
            {promo.discount_label}
        </Badge>
    );
};

export const ScopeBadge: React.FC<{ promo: PromoCode }> = ({ promo }) => {
    if (promo.is_seller_scoped) {
        return (
            <Badge variant="info">
                <Building2 aria-hidden="true" />
                {promo.seller_name || 'Seller'}
            </Badge>
        );
    }
    return <Badge variant="secondary">Platform</Badge>;
};

export const StatusBadge: React.FC<{ promo: PromoCode }> = ({ promo }) => {
    if (promo.is_live) return <Badge variant="success">Live</Badge>;
    if (promo.is_active) return <Badge variant="warning">Ready</Badge>;
    return <Badge variant="outline">Off</Badge>;
};

export const UsageBar: React.FC<{ promo: PromoCode }> = ({ promo }) => {
    if (!promo.max_redemptions) {
        return <span className="text-xs text-muted-foreground">{promo.current_redemptions} uses · no limit</span>;
    }
    const pct = Math.min(100, (promo.current_redemptions / promo.max_redemptions) * 100);
    const bar = pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-warning' : 'bg-success';
    return (
        <div className="min-w-[140px] space-y-1">
            <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                    <strong className="text-foreground">{promo.current_redemptions}</strong> / {promo.max_redemptions}
                </span>
                <span className="font-semibold text-foreground">{pct.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={cn('h-full rounded-full transition-all', bar)} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
};
