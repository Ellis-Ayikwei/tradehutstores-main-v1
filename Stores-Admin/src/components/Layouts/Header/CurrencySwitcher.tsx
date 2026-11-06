import { ShieldCheck } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { cn } from '@/lib/utils';
import { useCurrency } from '../../../contexts/CurrencyContext';
import { IRootState } from '../../../store';

const CurrencySwitcher = () => {
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl';
    const { currency, setCurrency, baseCurrency, setBaseCurrency, supportedCurrencies, fxAsOf, fxStale, fxSource } = useCurrency();

    const active = supportedCurrencies.find((c) => c.code === currency);
    const baseActive = supportedCurrencies.find((c) => c.code === baseCurrency);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground" aria-label={`Display currency: ${currency}`}>
                    <span className="font-mono text-xs font-bold tracking-wider">{active?.symbol ?? currency}</span>
                    <span className="hidden text-xs font-bold uppercase tracking-widest sm:inline">{currency}</span>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align={isRtl ? 'start' : 'end'} sideOffset={8} className="w-[min(18.75rem,calc(100vw-1rem))] p-0">
                {/* Display currency */}
                <div className="p-1">
                    <DropdownMenuLabel className="pb-0 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Display Currency</DropdownMenuLabel>
                    <p className="px-2 pb-1 text-xs text-muted-foreground">What you see in dashboards</p>
                    <DropdownMenuRadioGroup value={currency} onValueChange={setCurrency} className="max-h-56 overflow-y-auto">
                        {supportedCurrencies.map((c) => (
                            <DropdownMenuRadioItem key={`disp-${c.code}`} value={c.code} className="gap-2 py-2">
                                <span className="w-6 font-mono text-sm font-bold">{c.symbol}</span>
                                <span className="text-xs font-bold uppercase tracking-wider">{c.code}</span>
                                <span className="ml-auto truncate text-xs text-muted-foreground">{c.label}</span>
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </div>

                <DropdownMenuSeparator className="m-0" />

                {/* Base currency (admin) */}
                <div className="bg-muted p-1">
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="gap-2 py-2">
                            <ShieldCheck className="h-4 w-4 text-info" aria-hidden="true" />
                            <span className="flex flex-1 flex-col">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Store Base Currency</span>
                                <span className="text-xs text-muted-foreground">Catalog pricing currency · Admin only</span>
                            </span>
                            <Badge variant="info" className="px-1.5 py-0 text-[9px] uppercase tracking-wider">
                                {baseCurrency}
                            </Badge>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="max-h-72 w-60 overflow-y-auto">
                            <DropdownMenuRadioGroup value={baseCurrency} onValueChange={setBaseCurrency}>
                                {supportedCurrencies.map((c) => (
                                    <DropdownMenuRadioItem key={`base-${c.code}`} value={c.code}>
                                        <span className="truncate text-sm font-semibold">
                                            {c.symbol} · {c.code} — {c.label}
                                        </span>
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    {baseActive && (
                        <p className="px-2 pb-2 text-[11px] text-muted-foreground">
                            New listings &amp; orders will be priced in <span className="font-bold text-foreground">{baseActive.code}</span>.
                        </p>
                    )}
                </div>

                <DropdownMenuSeparator className="m-0" />

                {/* FX status footer */}
                <div className="flex items-center justify-between px-3 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <span className={cn('h-1.5 w-1.5 rounded-full', fxStale ? 'bg-warning' : 'bg-success')} />
                        {fxStale ? 'Rates stale' : 'Rates live'}
                    </span>
                    <span className="ml-2 truncate font-mono">
                        {fxSource ?? 'fallback'}
                        {fxAsOf ? ` · ${new Date(fxAsOf).toLocaleDateString()}` : ''}
                    </span>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default CurrencySwitcher;
