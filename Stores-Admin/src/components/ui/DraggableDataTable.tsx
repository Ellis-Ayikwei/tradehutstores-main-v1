import React, { useState, useEffect, useCallback, useRef, Suspense, lazy, useMemo, memo } from 'react';
import type { DataTableColumn, DataTableSortStatus } from 'mantine-datatable';
import { useDataTableColumns } from 'mantine-datatable';
import sortBy from 'lodash/sortBy';
import Tippy from '@tippyjs/react';
// Lazy-loaded heavy components
const DataTable = lazy(() => import('mantine-datatable').then(m => ({ default: m.DataTable })));

// Dynamically import icons on demand
const IconCaretDown = lazy(() => import('@tabler/icons-react').then(m => ({ default: m.IconCaretDown })));
const IconRefresh = lazy(() => import('@tabler/icons-react').then(m => ({ default: m.IconRefresh })));
const IconX = lazy(() => import('@tabler/icons-react').then(m => ({ default: m.IconX })));
const IconFile = lazy(() => import('@tabler/icons-react').then(m => ({ default: m.IconFile })));
const IconFilter = lazy(() => import('@tabler/icons-react').then(m => ({ default: m.IconFilter })));
const IconColumns = lazy(() => import('@tabler/icons-react').then(m => ({ default: m.IconColumns })));
const IconGripVertical = lazy(() => import('@tabler/icons-react').then(m => ({ default: m.IconGripVertical })));
const IconEye = lazy(() => import('@tabler/icons-react').then(m => ({ default: m.IconEye })));
const IconEyeOff = lazy(() => import('@tabler/icons-react').then(m => ({ default: m.IconEyeOff })));

// Local components with lazy loading
    const Dropdown = lazy(() => import('../Dropdown'));

// Utils with optimized imports
import get from 'lodash/get';
import IconLoader from '../Icon/IconLoader';


export type ColumnDefinition = {
    accessor: string;
    title: string;
    sortable?: boolean;
    hidden?: boolean;
    draggable?: boolean;
    width?: number | string;
    textAlign?: 'left' | 'center' | 'right';
    render?: (item: any) => React.ReactNode;
};

type DraggableDataTableProps = {
    data: any[];
    columns: Array<ColumnDefinition>;
    loading?: boolean;
    title: string;
    quickCheckFields?: string[];
    exportFileName?: string;
    storeKey?: string; 
    onRefreshData?: () => void;
    onSearch?: (query: string) => void;
    allowSelection?: boolean;
    actionButtons?: React.ReactNode;
    bulkActions?: (selectedRecords: any[]) => React.ReactNode;
    extraFilters?: React.ReactNode;
    headerContent?: React.ReactNode;
  
    onSelectionChange?: (selected: any[]) => void;
    selectedRecords?: any[];
    setSelectedRecords?: (records: any[]) => void;  
};

// Memoized Column Dropdown Content
const ColumnDropdownContent = memo(({ 
    columns, 
    visibleColumns, 
    onToggle, 
    onReset 
}: { 
    columns: Array<ColumnDefinition>;
    visibleColumns: string[];
    onToggle: (accessor: string, event?: React.MouseEvent) => void;
    onReset: (event?: React.MouseEvent) => void;
}) => (
    <div
        className="p-3 bg-white dark:bg-gray-800 min-w-[250px] rounded-md"
        onClick={(e) => e.stopPropagation()}
    >
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
            <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Manage Columns</span>
            <button
                className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/40 px-2 py-1 rounded-md transition-colors font-medium"
                onClick={onReset}
            >
                Reset
            </button>
        </div>
        <ul className="max-h-[250px] overflow-y-auto">
            {columns.map((column) => {
                const isVisible = visibleColumns.includes(column.accessor);
                return (
                    <li key={column.accessor} className="mb-1">
                        <label
                            className={`flex items-center py-1.5 px-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                                isVisible ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
                            }`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="mr-2">
                                {isVisible ? 
                                    <IconEye className="w-4 h-4 text-blue-500 dark:text-blue-400" /> :
                                    <IconEyeOff className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                }
                            </div>
                            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{column.title}</span>
                            <div className="ml-auto flex items-center">
                                <button 
                                    type="button" 
                                    className="relative inline-flex items-center cursor-pointer" 
                                    onClick={(e) => onToggle(column.accessor, e)}
                                >
                                    <input type="checkbox" checked={isVisible} readOnly className="sr-only peer" />
                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                </button>
                                <IconGripVertical className="ml-2 text-gray-400 w-4 h-4" />
                            </div>
                        </label>
                    </li>
                );
            })}
        </ul>
    </div>
));

// Memoized Column Dropdown Button
const ColumnDropdownButton = memo(() => (
    <>
        <IconColumns className="w-4 h-4 mr-2" />
        <span>Columns</span>
        <IconCaretDown className="w-4 h-4 ml-2" />
    </>
));

// Move initial state calculation outside component
const getInitialVisibleColumns = (columns: Array<ColumnDefinition>, storeKey: string) => {
    try {
        const saved = localStorage.getItem(`${storeKey}-visibility`);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading column visibility', error);
    }
    return columns.filter((col) => !col.hidden).map((col) => col.accessor);
};

const DraggableDataTable: React.FC<DraggableDataTableProps> = ({
    data,
    columns: initialColumns,
    loading,
    title,
    exportFileName = 'exported-data',
    storeKey = 'data-table-columns',
    onRefreshData,
    onSearch,
    allowSelection = true,
    actionButtons,
    bulkActions,
    quickCheckFields = ['id', 'name', 'title', 'email', 'phone', 'invoice_number'],
    extraFilters,
    headerContent,
    onSelectionChange,
    selectedRecords: externalSelectedRecords,
    setSelectedRecords: externalSetSelectedRecords,
}) => {
    // Use ref to track initial render
    const isInitialRender = useRef(true);
    
    // Add back the columnDropdownRef
    const columnDropdownRef = useRef<any>(null);
    
    // Initialize state with stable value
    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => 
        getInitialVisibleColumns(initialColumns, storeKey)
    );

    // Memoize visible columns calculation
    const visibleColumnsWithDraggable = useMemo(() => {
        if (!Array.isArray(initialColumns)) {
            console.error('initialColumns is not an array:', initialColumns);
            return [];
        }
        

        //The initial columns 
        return initialColumns
            .filter((col) => visibleColumns.includes(col.accessor))
            .map((col) => ({
                ...col,
                draggable: true,
                resizable: true,
                sortable: true,
            }));
    }, [initialColumns, visibleColumns]);

    const { effectiveColumns = [], setColumnsOrder, resetColumnsOrder } = useDataTableColumns({
        key: storeKey,
        columns: visibleColumnsWithDraggable || [],
    });

    // Optimize toggle function with batched updates and initial render check
    const toggleColumnVisibility = useCallback((accessor: string, event?: React.MouseEvent) => {
        event?.stopPropagation();

        setVisibleColumns((prev) => {
            const newColumns = prev.includes(accessor)
                ? prev.filter((a) => a !== accessor)
                : [...prev, accessor];
                
            // Only update localStorage after initial render
            if (!isInitialRender.current) {
                requestAnimationFrame(() => {
                    localStorage.setItem(`${storeKey}-visibility`, JSON.stringify(newColumns));
                });
            }
            
            return newColumns;
        });
    }, [storeKey]);

    // Optimize reset function with initial render check and column order reset
    const handleResetColumns = useCallback((event?: React.MouseEvent) => {
            event?.stopPropagation();

        const defaultVisible = initialColumns
            .filter((col) => !col.hidden)
            .map((col) => col.accessor);
            
            setVisibleColumns(defaultVisible);

        // Reset column order
            resetColumnsOrder();
        
        // Only update localStorage after initial render
        if (!isInitialRender.current) {
            requestAnimationFrame(() => {
                localStorage.setItem(`${storeKey}-visibility`, JSON.stringify(defaultVisible));
            });
        }
    }, [initialColumns, storeKey, resetColumnsOrder]);

    // Set initial render flag to false after first render
    useEffect(() => {
        isInitialRender.current = false;
    }, []);

    // State management
    const [search, setSearch] = useState('');
    const [filteredData, setFilteredData] = useState<any[]>(data);
    // Internal state for selections when not controlled externally
    const [internalSelectedRecords, setInternalSelectedRecords] = useState<any[]>([]);
    
    // Determine which selectedRecords to use (external or internal)
    const selectedRecords = externalSelectedRecords !== undefined ? externalSelectedRecords : internalSelectedRecords;
    
    // Create a setter that handles both internal and external state
    const updateSelectedRecords = useCallback((records: any[]) => {
        if (externalSetSelectedRecords) {
            // Use external setter if provided
            externalSetSelectedRecords(records);
        } else {
            // Otherwise use internal state
            setInternalSelectedRecords(records);
        }
    }, [externalSetSelectedRecords]);
    
    // Handler for selection changes
    const handleSelectionChange = useCallback((records: any[]) => {
        // Update the appropriate state
        updateSelectedRecords(records);
        
        // Notify parent if callback provided
        onSelectionChange?.(records);
    }, [updateSelectedRecords, onSelectionChange]);
    
    // Handler for clearing selections
    const clearSelections = useCallback(() => {
        updateSelectedRecords([]);
    }, [updateSelectedRecords]);
    
    // Update internal records if external records change
    useEffect(() => {
        if (externalSelectedRecords !== undefined) {
            setInternalSelectedRecords(externalSelectedRecords);
        }
    }, [externalSelectedRecords]);
    
    // Handle updates after actions - pass clearSelections to actionButtons
    const wrappedActionButtons = actionButtons 
        ? React.cloneElement(actionButtons as React.ReactElement, { 
            clearSelections, 
            selectedRecords 
          })
        : null;

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: "created_at",
        direction: 'desc',
    });

    useEffect(() => {
        const data = sortBy(filteredData, sortStatus.columnAccessor) as any[];
        setFilteredData(sortStatus.direction === 'desc' ? data.reverse() : data);
      }, [sortStatus]);


    // Sanitize data to prevent undefined values from causing errors in mantine-datatable
    const sanitizeData = useCallback((dataArray: any[]): any[] => {
        if (!Array.isArray(dataArray)) return [];
        
        return dataArray.map(item => {
            if (!item || typeof item !== 'object') return item;
            
            const sanitized: any = {};
            for (const key in item) {
                const value = item[key];
                // Convert undefined to empty string for string fields, null for others
                if (value === undefined) {
                    sanitized[key] = '';
                } else if (value === null) {
                    sanitized[key] = null;
                } else if (typeof value === 'string' && value.length === 0) {
                    sanitized[key] = '';
                } else {
                    sanitized[key] = value;
                }
            }
            return sanitized;
        });
    }, []);

    // Update filtered data when data changes
    useEffect(() => {
        if (Array.isArray(data)) {
            const sanitized = sanitizeData(data);
            setFilteredData(sanitized);
        } else {
            console.error('Data is not an array:', data);
            setFilteredData([]);
        }
    }, [data, sanitizeData]);

    // Filter data based on search
    useEffect(() => {
        if (!search.trim()) {
            setFilteredData(data);
            return;
        }

        const searchLower = search.toLowerCase();
        const accessors = initialColumns.map((col) => ({
            path: col.accessor,
            render: col.render,
        }));

        const result = data.filter((item) => {
            // First try exact matches on key identifiers for better performance
            // These quick checks can avoid more expensive operations for common searches
            for (const field of quickCheckFields) {
                const value = get(item, field);
                if (value && String(value).toLowerCase().includes(searchLower)) {
                    return true;
                }
            }

            // Then check each column accessor
            return accessors.some(({ path, render }) => {
                // Get value using the accessor path
                const value = get(item, path);

                // Skip undefined/null values
                if (value === null || value === undefined) {
                    return false;
                }

                // For primitive values, do direct string comparison
                if (typeof value !== 'object') {
                    return String(value).toLowerCase().includes(searchLower);
                }

                // For dates, check formatted strings
                if (value instanceof Date) {
                    return value.toLocaleDateString().toLowerCase().includes(searchLower) || value.toISOString().toLowerCase().includes(searchLower);
                }

                // For objects (like nested entities)
                if (typeof value === 'object') {
                    // Check common name properties first
                    const nameProps = ['name', 'title', 'label', 'full_name', 'description'];
                    for (const prop of nameProps) {
                        if (value[prop] && String(value[prop]).toLowerCase().includes(searchLower)) {
                            return true;
                        }
                    }

                    // As a fallback, stringify the object, but only for smaller objects to avoid performance issues
                    if (Object.keys(value).length < 10) {
                        try {
                            return JSON.stringify(value).toLowerCase().includes(searchLower);
                        } catch (e) {
                            // If stringification fails, skip
                            return false;
                        }
                    }
                }

                return false;
            });
        });

        setFilteredData(result);
    }, [data, search, initialColumns, quickCheckFields]);

    // Handle search input change
    const handleSearchChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setSearch(value);
            onSearch?.(value);
        },
        [onSearch]
    );

    // Export data to Excel
    const handleExportExcel = useCallback(async () => {
        const { downloadExcel } = await import('react-export-table-to-excel');
        const visibleColumnsData = visibleColumnsWithDraggable;

        const header = visibleColumnsData.map((col) => col.title);
        const body = filteredData.map((item) =>
            visibleColumnsData.map((col) => {
                // Handle nested properties
                const getNestedValue = (obj: any, path: string): any => {
                    const parts = path.split('.');
                    if (parts.length === 1) return obj?.[path];

                    const [first, ...rest] = parts;
                    const restPath = rest.join('.');
                    return obj?.[first] ? getNestedValue(obj[first], restPath) : undefined;
                };

                const value = getNestedValue(item, String(col.accessor));
                return value !== undefined ? String(value) : '';
            })
        );

        downloadExcel({
            fileName: exportFileName,
            sheet: title,
            tablePayload: {
                header,
                body,
            },
        });
    }, [visibleColumnsWithDraggable, filteredData, exportFileName, title]);

    // Clear search
    const clearSearch = useCallback(() => {
        setSearch('');
        onSearch?.('');
    }, [onSearch]);


const NoRecordsFound = () => (
  <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
   <img src="/assets/images/enterprise_life.png" alt="No records found" className="w-12 h-12 mb-3 opacity-30" />
    <p>No records found</p>
  </div>
);
    return (
        <div className="panel p-0 mt-6 overflow-hidden rounded-none bg-white dark:bg-gray-800/95 shadow-sm border border-gray-200/80 dark:border-gray-700/80">
            {/* Header content if provided */}
            {headerContent && (
                <div className="border-b border-gray-200/80 dark:border-gray-700/80">
                    {headerContent}
                </div>
            )}

            {/* Title and action buttons */}
            <div className="flex md:items-center md:flex-row flex-col gap-4 p-5 border-b border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-800/95">
                {/* Title with styled badge */}
                <div className="flex items-center">
                    <h5 className="font-semibold text-lg text-gray-800 dark:text-white">{title}</h5>
                    {filteredData.length > 0 && (
                        <span className="ml-3 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full">
                            {filteredData.length} {filteredData.length === 1 ? 'record' : 'records'}
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3 md:ml-auto">
                    {/* Search input with enhanced styling */}
                    <div className="relative flex-grow md:flex-grow-0">
                        <input
                            type="text"
                            className="form-input w-full md:w-64 pl-9 pr-10 py-2 rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/80 focus:border-primary dark:focus:border-primary focus:ring focus:ring-primary/20 dark:focus:ring-primary/40 transition-colors shadow-sm"
                            placeholder="Search..."
                            value={search}
                            onChange={handleSearchChange}
                        />
                        <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                        </span>
                        {search && (
                            <button 
                                type="button" 
                                className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" 
                                onClick={clearSearch}
                            >
                                <IconX className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Controls Group - Export, Column Toggle, Filters */}
                    <div className="flex items-center gap-2">
                        {/* Export button */}
                        <button 
                            type="button" 
                            className="btn bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600/80 flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm hover:shadow"
                            onClick={handleExportExcel}
                        >
                            <IconFile className="w-4 h-4 mr-2" />
                            <span>Export</span>
                        </button>

                        {/* Column visibility dropdown with enhanced styling */}
                        <Dropdown
                            ref={columnDropdownRef}
                            placement="bottom-start"
                            btnClassName="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 flex items-center px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600/80 transition-colors shadow-sm hover:shadow"
                            button={<ColumnDropdownButton />}
                            dropdownClassName="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg py-2"
                            closeOnSelect={false}
                        >
                            <ColumnDropdownContent
                                columns={initialColumns}
                                visibleColumns={visibleColumns}
                                onToggle={toggleColumnVisibility}
                                onReset={handleResetColumns}
                            />
                        </Dropdown>

                        {/* Filter button - if we have extra filters */}
                        {extraFilters && (
                            <Dropdown
                                placement="bottom-end"
                                btnClassName="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 flex items-center px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600/80 transition-colors shadow-sm hover:shadow"
                                button={
                                    <>
                                        <IconFilter className="w-4 h-4 mr-2" />
                                        <span>Filters</span>
                                    </>
                                }
                                dropdownClassName="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg py-2"
                            >
                                <div className="p-3 bg-white dark:bg-gray-800 min-w-[200px] rounded-md">
                                    <div className="mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                                        <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Filters</span>
                                    </div>
                                    {extraFilters}
                                </div>
                            </Dropdown>
                        )}

                        {/* Refresh button */}
                        {onRefreshData && (
                            <Tippy content="Refresh data">
                                <button
                                    type="button"
                                    className="btn bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 w-9 h-9 p-0 rounded-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600/80 text-gray-700 dark:text-gray-300 transition-colors shadow-sm hover:shadow"
                                    onClick={onRefreshData}
                                >
                                    <IconRefresh className="w-5 h-5" />
                                </button>
                            </Tippy>
                        )}
                    </div>

                    {/* Action buttons */}
                    {wrappedActionButtons}
                </div>
            </div>

            {/* Bulk actions bar - Fixed at top with conditional rendering */}
            {selectedRecords.length > 0 && bulkActions && (
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-800/50">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300 pl-2">
                        {selectedRecords.length} {selectedRecords.length === 1 ? 'item' : 'items'} selected
                    </span>
                    <div className="flex items-center gap-1">
                        {bulkActions(selectedRecords)}
                    </div>
                    <button 
                        onClick={clearSelections}
                        className="btn btn-sm btn-outline-primary"
                    >
                        Clear
                    </button>
                </div>
            )}

            {/* Data table with enhanced styling */}
            <div className="datatables p-x-2">
                <DataTable
                    className="whitespace-nowrap bg-white dark:bg-gray-800/90 rounded-lg overflow-hidden border-gray-200 dark:border-gray-700 [&_td]:border-r [&_td]:border-gray-200 [&_th]:border-r [&_th]:border-gray-200 dark:[&_td]:border-gray-700 dark:[&_th]:border-gray-700 [&_td]:bg-white [&_th]:bg-gray-50 dark:[&_td]:bg-gray-800 dark:[&_th]:bg-gray-700 [&_.mantine-DataTable-columnHeader--dragging]:z-50 [&_.mantine-DataTable-columnHeader--dragging]:opacity-90 [&_.mantine-DataTable-columnHeader--dragging]:shadow-lg [&_.mantine-DataTable-columnHeader--dragging]:bg-white [&_.mantine-DataTable-columnHeader--dragging]:dark:bg-gray-800 [&_td]:overflow-hidden [&_th]:overflow-hidden [&_td]:text-ellipsis [&_th]:text-ellipsis [&_.mantine-DataTable-cell]:overflow-hidden [&_.mantine-DataTable-cell]:text-ellipsis [&_.mantine-DataTable-columnHeader]:overflow-hidden [&_.mantine-DataTable-columnHeader]:text-ellipsis"
                    records={Array.isArray(filteredData) ? filteredData : []}
                    columns={Array.isArray(effectiveColumns) ? effectiveColumns as DataTableColumn<unknown>[] : []}
                    fetching={loading}
                    customLoader={
                        <div className="flex items-center justify-center h-40">
                            <IconLoader className="w-10 h-10 animate-spin text-primary" />
                        </div>
                    }
                    totalRecords={(filteredData || []).length}
                    recordsPerPage={pageSize}
                    page={page}
                    onPageChange={setPage}
                    recordsPerPageOptions={PAGE_SIZES}
                    onRecordsPerPageChange={setPageSize}
                    sortStatus={sortStatus}
                    onSortStatusChange={setSortStatus}
                    selectedRecords={allowSelection ? selectedRecords : []}
                    onSelectedRecordsChange={allowSelection ? handleSelectionChange : undefined}
                    striped={true}
                    minHeight={300}
                    shadow="lg"
                    horizontalSpacing="lg"
                    withTableBorder
                    withColumnBorders
                    highlightOnHover={true}
                    noRecordsText="No Records Found"
                    storeColumnsKey={storeKey}
                    paginationText={({ from, to, totalRecords }) => (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Showing {from} to {to} of <span className="font-medium text-gray-700 dark:text-gray-300">{totalRecords}</span> entries
                        </div>
                    )}
                    styles={{
                        table: {
                            borderCollapse: 'collapse',
                        },
                        header: {
                            backgroundColor: 'var(--mantine-color-gray-0)',
                            borderBottom: '1px solid var(--mantine-color-gray-3)',
                        },
                        pagination: {
                            borderTop: '1px solid var(--mantine-color-gray-3)',
                            padding: '0.75rem 1rem',
                        },
                        root: {
                            '& .mantine-DataTable-header': {
                                backgroundColor: 'white !important',
                            },
                            '& .mantine-DataTable-header th': {
                                backgroundColor: 'white !important',
                                borderRight: '1px solid var(--mantine-color-gray-2)',
                                overflow: 'hidden !important',
                                textOverflow: 'ellipsis !important',
                                whiteSpace: 'nowrap !important',
                            },
                            '& .mantine-DataTable-body td': {
                                backgroundColor: 'white !important',
                                borderRight: '1px solid var(--mantine-color-gray-2)',
                                overflow: 'hidden !important',
                                textOverflow: 'ellipsis !important',
                                whiteSpace: 'nowrap !important',
                            },
                            '& .mantine-DataTable-body tr:nth-child(even) td': {
                                backgroundColor: 'white !important',
                            },
                            '& .mantine-DataTable-body tr:nth-child(odd) td': {
                                backgroundColor: 'white !important',
                            },
                            '& .mantine-DataTable-columnHeader--dragging': {
                                zIndex: 50,
                                opacity: 0.9,
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                backgroundColor: 'white !important',
                                overflow: 'hidden !important',
                            },
                            '& .mantine-DataTable-columnHeader': {
                                overflow: 'hidden !important',
                                textOverflow: 'ellipsis !important',
                                whiteSpace: 'nowrap !important',
                            },
                            '& .mantine-DataTable-cell': {
                                overflow: 'hidden !important',
                                textOverflow: 'ellipsis !important',
                                whiteSpace: 'nowrap !important',
                            },
                        },
                    }}
                />
            </div>
        </div>
    );
};

// const DraggableDataTableWithSuspense = (props) => (
//     <Suspense fallback={
//         <div className="panel mt-6 p-8 flex justify-center items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
//             <IconLoader className="w-8 h-8 animate-spin text-primary" />
//             <span className="ml-2 text-gray-600 dark:text-gray-400">Loading table...</span>
//         </div>
//     }>
//         <DraggableDataTable {...props} />
//     </Suspense>
// );

export default DraggableDataTable;