import * as React from 'react';
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type Row, type RowData, type SortingState } from '@tanstack/react-table';
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Columns3, Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/shadcn/dropdown-menu';
import { EmptyState } from '@/components/shadcn/empty-state';
import { Input } from '@/components/shadcn/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shadcn/table';

declare module '@tanstack/react-table' {
    interface ColumnMeta<TData extends RowData, TValue> {
        /** Label shown for this column in the mobile card and the column-visibility menu. Defaults to a string `header`. */
        label?: string;
        /** Hide this column in the mobile card layout. */
        hideOnMobile?: boolean;
        /** Use this column's cell as the card title on mobile (defaults to the first column with a label). */
        cardTitle?: boolean;
        /** Extra classes for the desktop <th>/<td>. */
        className?: string;
    }
}

export interface DataTableSort {
    id: string;
    desc: boolean;
}

export interface DataTableProps<TData> {
    columns: ColumnDef<TData>[];
    /** Current page rows only. Pagination, sorting and filtering happen on the server. */
    data: TData[];
    /** Total rows across all pages (from the API `count`). */
    total: number;
    /** 1-based page number. */
    page: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    pageSizeOptions?: number[];
    sort?: DataTableSort | null;
    onSortChange?: (sort: DataTableSort | null) => void;
    /** Controlled search value; `onSearchChange` is debounced (300ms). Omit to hide the search box. */
    search?: string;
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;
    /** Extra filter controls (selects, date pickers...) rendered next to the search box. */
    toolbar?: React.ReactNode;
    isLoading?: boolean;
    /** Any thrown value (Error, axios error, string). A message with a retry button is shown instead of rows. */
    error?: unknown;
    onRetry?: () => void;
    /** Replaces the default "No results" empty state. */
    emptyState?: React.ReactNode;
    getRowId?: (row: TData, index: number) => string;
    onRowClick?: (row: TData) => void;
    /** Custom mobile card. Defaults to a label/value list built from the columns. */
    renderMobileCard?: (row: TData) => React.ReactNode;
    /** Show the "Columns" visibility menu. Default true. */
    enableColumnVisibility?: boolean;
    className?: string;
}

function getErrorMessage(error: unknown): string {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (typeof error === 'object') {
        const response = (error as { response?: { data?: { detail?: unknown; message?: unknown } } }).response;
        const detail = response?.data?.detail ?? response?.data?.message;
        if (typeof detail === 'string') return detail;
        const message = (error as { message?: unknown }).message;
        if (typeof message === 'string') return message;
    }
    return 'Something went wrong while loading data.';
}

function columnLabel<TData>(column: { id: string; columnDef: ColumnDef<TData> }): string | undefined {
    const metaLabel = column.columnDef.meta?.label;
    if (metaLabel) return metaLabel;
    return typeof column.columnDef.header === 'string' ? column.columnDef.header : undefined;
}

export function DataTable<TData>({
    columns,
    data,
    total,
    page,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 25, 50, 100],
    sort,
    onSortChange,
    search,
    onSearchChange,
    searchPlaceholder = 'Search...',
    toolbar,
    isLoading = false,
    error,
    onRetry,
    emptyState,
    getRowId,
    onRowClick,
    renderMobileCard,
    enableColumnVisibility = true,
    className,
}: DataTableProps<TData>) {
    const [columnVisibility, setColumnVisibility] = React.useState<Record<string, boolean>>({});
    const [searchValue, setSearchValue] = React.useState(search ?? '');

    React.useEffect(() => {
        setSearchValue(search ?? '');
    }, [search]);

    React.useEffect(() => {
        if (!onSearchChange || searchValue === (search ?? '')) return;
        const timer = window.setTimeout(() => onSearchChange(searchValue), 300);
        return () => window.clearTimeout(timer);
    }, [searchValue, search, onSearchChange]);

    const sorting = React.useMemo<SortingState>(() => (sort ? [{ id: sort.id, desc: sort.desc }] : []), [sort]);
    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    const table = useReactTable({
        data,
        columns,
        getRowId,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
        pageCount,
        state: { sorting, columnVisibility },
        onColumnVisibilityChange: setColumnVisibility,
    });

    const cycleSort = (columnId: string) => {
        if (!onSortChange) return;
        if (!sort || sort.id !== columnId) onSortChange({ id: columnId, desc: false });
        else if (!sort.desc) onSortChange({ id: columnId, desc: true });
        else onSortChange(null);
    };

    const rows = table.getRowModel().rows;
    const visibleColumnCount = table.getVisibleLeafColumns().length;
    const errorMessage = getErrorMessage(error);
    const hasError = Boolean(error);
    const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const lastRow = Math.min(page * pageSize, total);
    const toggleableColumns = table.getAllLeafColumns().filter((column) => column.getCanHide() && columnLabel(column));

    const renderDefaultCard = (row: Row<TData>) => {
        const cells = row.getVisibleCells().filter((cell) => !cell.column.columnDef.meta?.hideOnMobile);
        const titleCell = cells.find((cell) => cell.column.columnDef.meta?.cardTitle) ?? cells.find((cell) => columnLabel(cell.column));
        const labelled = cells.filter((cell) => cell !== titleCell && columnLabel(cell.column));
        const unlabelled = cells.filter((cell) => cell !== titleCell && !columnLabel(cell.column));

        return (
            <Card
                key={row.id}
                className={cn('space-y-3 p-4', onRowClick && 'cursor-pointer transition-colors hover:bg-muted')}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
            >
                {titleCell ? <div className="text-base font-semibold text-foreground">{flexRender(titleCell.column.columnDef.cell, titleCell.getContext())}</div> : null}
                {labelled.length > 0 ? (
                    <dl className="space-y-2">
                        {labelled.map((cell) => (
                            <div key={cell.id} className="flex items-start justify-between gap-4 text-sm">
                                <dt className="shrink-0 text-muted-foreground">{columnLabel(cell.column)}</dt>
                                <dd className="min-w-0 break-words text-right text-foreground">{flexRender(cell.column.columnDef.cell, cell.getContext())}</dd>
                            </div>
                        ))}
                    </dl>
                ) : null}
                {unlabelled.length > 0 ? (
                    <div className="flex items-center justify-end gap-2 border-t pt-3" onClick={(event) => event.stopPropagation()}>
                        {unlabelled.map((cell) => (
                            <React.Fragment key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</React.Fragment>
                        ))}
                    </div>
                ) : null}
            </Card>
        );
    };

    const showToolbar = Boolean(onSearchChange || toolbar || (enableColumnVisibility && toggleableColumns.length > 0));

    return (
        <div className={cn('space-y-3', className)}>
            {showToolbar ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {onSearchChange ? (
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                            <Input
                                type="search"
                                value={searchValue}
                                onChange={(event) => setSearchValue(event.target.value)}
                                placeholder={searchPlaceholder}
                                aria-label={searchPlaceholder}
                                className="pl-9"
                            />
                        </div>
                    ) : null}
                    {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
                    {enableColumnVisibility && toggleableColumns.length > 0 ? (
                        <div className="hidden sm:ml-auto md:block">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Columns3 />
                                        Columns
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {toggleableColumns.map((column) => (
                                        <DropdownMenuCheckboxItem key={column.id} checked={column.getIsVisible()} onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}>
                                            {columnLabel(column)}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ) : null}
                </div>
            ) : null}

            {hasError ? (
                <Card className="flex flex-col items-center gap-3 px-4 py-10 text-center" role="alert">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive-subtle text-destructive-subtle-foreground">
                        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-base font-semibold text-foreground">Could not load data</p>
                        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{errorMessage}</p>
                    </div>
                    {onRetry ? (
                        <Button variant="outline" size="sm" onClick={onRetry}>
                            Try again
                        </Button>
                    ) : null}
                </Card>
            ) : isLoading ? (
                <>
                    <Card className="hidden overflow-hidden md:block" aria-busy="true">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {table.getHeaderGroups()[0]?.headers.map((header) => (
                                        <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Array.from({ length: Math.min(pageSize, 8) }).map((_, rowIndex) => (
                                    <TableRow key={rowIndex}>
                                        {Array.from({ length: visibleColumnCount }).map((__, cellIndex) => (
                                            <TableCell key={cellIndex}>
                                                <Skeleton className="h-4 w-full max-w-[160px]" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                    <div className="space-y-3 md:hidden" aria-busy="true">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <Card key={index} className="space-y-3 p-4">
                                <Skeleton className="h-5 w-2/3" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-4/5" />
                            </Card>
                        ))}
                    </div>
                </>
            ) : rows.length === 0 ? (
                <Card>{emptyState ?? <EmptyState title="No results found" description={search ? 'Try a different search or clear your filters.' : 'There is nothing to show here yet.'} />}</Card>
            ) : (
                <>
                    <Card className="hidden overflow-hidden md:block">
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id} className="hover:bg-transparent">
                                        {headerGroup.headers.map((header) => {
                                            const canSort = Boolean(onSortChange) && header.column.getCanSort();
                                            const direction = sort?.id === header.column.id ? (sort.desc ? 'descending' : 'ascending') : 'none';
                                            return (
                                                <TableHead key={header.id} aria-sort={canSort ? direction : undefined} className={header.column.columnDef.meta?.className}>
                                                    {header.isPlaceholder ? null : canSort ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => cycleSort(header.column.id)}
                                                            className="-ml-1 inline-flex items-center gap-1 rounded px-1 py-1 uppercase tracking-wide hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                        >
                                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                                            {direction === 'ascending' ? <ArrowUp className="h-3.5 w-3.5" /> : direction === 'descending' ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />}
                                                        </button>
                                                    ) : (
                                                        flexRender(header.column.columnDef.header, header.getContext())
                                                    )}
                                                </TableHead>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {rows.map((row) => (
                                    <TableRow key={row.id} className={cn(onRowClick && 'cursor-pointer')} onClick={onRowClick ? () => onRowClick(row.original) : undefined}>
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                    <div className="space-y-3 md:hidden">{rows.map((row) => (renderMobileCard ? <React.Fragment key={row.id}>{renderMobileCard(row.original)}</React.Fragment> : renderDefaultCard(row)))}</div>
                </>
            )}

            {!hasError && total > 0 ? (
                <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <p>
                        Showing <span className="font-semibold text-foreground">{firstRow}</span>-<span className="font-semibold text-foreground">{lastRow}</span> of{' '}
                        <span className="font-semibold text-foreground">{total}</span>
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                        {onPageSizeChange ? (
                            <div className="flex items-center gap-2">
                                <span className="hidden sm:inline">Rows per page</span>
                                <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
                                    <SelectTrigger className="h-9 w-[76px]" aria-label="Rows per page">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pageSizeOptions.map((option) => (
                                            <SelectItem key={option} value={String(option)}>
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : null}
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1 || isLoading} aria-label="Previous page">
                                <ChevronLeft />
                            </Button>
                            <span className="min-w-[5.5rem] text-center">
                                Page {page} of {pageCount}
                            </span>
                            <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount || isLoading} aria-label="Next page">
                                <ChevronRight />
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
