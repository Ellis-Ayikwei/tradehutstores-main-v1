import { useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { useSelector } from 'react-redux';
import { TrendingUp } from 'lucide-react';
import dayjs from 'dayjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { EmptyState } from '@/components/shadcn/empty-state';
import { IRootState } from '@/store';
import { formatMoney, type SellerDailySales } from '@/services/sellerStatsService';

/** Resolves a theme CSS variable (`--primary`) to an rgb() string ApexCharts can use. */
function themeColor(variable: string): string {
    const probe = document.createElement('span');
    probe.style.color = `hsl(var(${variable}))`;
    probe.style.display = 'none';
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved;
}

interface SalesChartProps {
    series: SellerDailySales[];
    currency: string;
}

export function SalesChart({ series, currency }: SalesChartProps) {
    const theme = useSelector((state: IRootState) => state.themeConfig.theme);

    const hasSales = series.some((d) => Number(d.total) > 0);

    const { options, data } = useMemo(() => {
        const primary = themeColor('--primary');
        const muted = themeColor('--muted-foreground');
        const border = themeColor('--border');
        const opts: ApexOptions = {
            chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'inherit', foreColor: muted, background: 'transparent' },
            colors: [primary],
            stroke: { curve: 'smooth', width: 2 },
            dataLabels: { enabled: false },
            fill: { type: 'solid', opacity: 0.14 },
            grid: { borderColor: border, strokeDashArray: 3, padding: { left: 4, right: 8 } },
            xaxis: {
                type: 'datetime',
                labels: { datetimeUTC: false, format: 'd MMM' },
                axisBorder: { show: false },
                axisTicks: { show: false },
                tooltip: { enabled: false },
            },
            yaxis: { labels: { formatter: (v) => formatMoney(v, currency).replace(/\.00$/, '') }, min: 0 },
            tooltip: { theme: theme === 'dark' ? 'dark' : 'light', x: { format: 'd MMM yyyy' }, y: { formatter: (v) => formatMoney(v, currency) } },
        };
        return {
            options: opts,
            data: [{ name: 'Sales', data: series.map((d) => ({ x: dayjs(d.date).valueOf(), y: Number(d.total) })) }],
        };
    }, [series, currency, theme]);

    return (
        <Card>
            <CardHeader className="p-4 pb-0 sm:p-5 sm:pb-0">
                <CardTitle className="text-base">Sales, last 30 days</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-2 sm:p-3 sm:pt-2">
                {hasSales ? (
                    <ReactApexChart key={theme} type="area" height={240} series={data} options={options} />
                ) : (
                    <EmptyState icon={TrendingUp} title="No sales in the last 30 days" description="Your daily sales will chart here once orders are paid." className="py-8" />
                )}
            </CardContent>
        </Card>
    );
}
