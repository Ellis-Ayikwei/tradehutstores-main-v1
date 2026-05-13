import { useSelector } from 'react-redux';
import Dropdown from '../../Dropdown';
import { IRootState } from '../../../store';
import { useCurrency } from '../../../contexts/CurrencyContext';

const CurrencySwitcher = () => {
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl';
    const {
        currency,
        setCurrency,
        baseCurrency,
        setBaseCurrency,
        supportedCurrencies,
        fxAsOf,
        fxStale,
        fxSource,
    } = useCurrency();

    const active = supportedCurrencies.find((c) => c.code === currency);
    const baseActive = supportedCurrencies.find((c) => c.code === baseCurrency);

    return (
        <Dropdown
            offset={[0, 8]}
            placement={isRtl ? 'bottom-start' : 'bottom-end'}
            btnClassName="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-on-surface-variant hover:text-primary-container hover:bg-surface-container-low transition-all duration-200"
            button={
                <>
                    <span className="font-mono text-xs font-bold tracking-wider">
                        {active?.symbol ?? currency}
                    </span>
                    <span className="hidden sm:inline text-xs font-bold uppercase tracking-widest">
                        {currency}
                    </span>
                </>
            }
        >
            <div className="w-[300px] bg-surface-container-lowest/95 backdrop-blur-xl border border-outline-variant/15 rounded-2xl shadow-card-hover overflow-hidden">
                {/* Display Currency */}
                <div className="p-4 border-b border-outline-variant/10">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-70">
                                Display Currency
                            </h4>
                            <p className="text-xs text-on-surface-variant opacity-60">
                                What you see in dashboards
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 max-h-44 overflow-y-auto pr-1">
                        {supportedCurrencies.map((c) => (
                            <button
                                key={`disp-${c.code}`}
                                type="button"
                                onClick={() => setCurrency(c.code)}
                                className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                                    c.code === currency
                                        ? 'bg-primary-container/15 text-primary-container'
                                        : 'hover:bg-surface-container-low text-on-surface'
                                }`}
                            >
                                <span className="font-mono text-sm">{c.symbol}</span>
                                <span className="text-[10px] uppercase tracking-wider opacity-80">
                                    {c.code}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Base Currency (Admin) */}
                <div className="p-4 bg-surface-container/40 border-b border-outline-variant/10">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-base text-tertiary">
                            admin_panel_settings
                        </span>
                        <div className="flex-1">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-70">
                                Store Base Currency
                            </h4>
                            <p className="text-xs text-on-surface-variant opacity-60">
                                Catalog pricing currency · Admin only
                            </p>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-tertiary/10 text-tertiary">
                            Admin
                        </span>
                    </div>
                    <select
                        value={baseCurrency}
                        onChange={(e) => setBaseCurrency(e.target.value)}
                        className="w-full text-sm font-bold bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-primary-container"
                    >
                        {supportedCurrencies.map((c) => (
                            <option key={`base-${c.code}`} value={c.code}>
                                {c.symbol} · {c.code} — {c.label}
                            </option>
                        ))}
                    </select>
                    {baseActive && (
                        <p className="mt-2 text-[10px] text-on-surface-variant opacity-70">
                            New listings & orders will be priced in{' '}
                            <span className="font-bold text-on-surface">{baseActive.code}</span>.
                        </p>
                    )}
                </div>

                {/* FX status footer */}
                <div className="px-4 py-3 flex items-center justify-between text-[10px] uppercase tracking-widest text-on-surface-variant opacity-70">
                    <span className="flex items-center gap-1.5">
                        <span
                            className={`w-1.5 h-1.5 rounded-full ${
                                fxStale ? 'bg-bid-amber' : 'bg-bid-green'
                            }`}
                        />
                        {fxStale ? 'Rates stale' : 'Rates live'}
                    </span>
                    <span className="truncate ml-2 font-mono">
                        {fxSource ?? 'fallback'}
                        {fxAsOf ? ` · ${new Date(fxAsOf).toLocaleDateString()}` : ''}
                    </span>
                </div>
            </div>
        </Dropdown>
    );
};

export default CurrencySwitcher;
