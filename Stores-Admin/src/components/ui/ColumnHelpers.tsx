import { ColumnDefinition } from './DraggableDataTable';

// Helper function to create columns with proper width management
export const createColumn = (
    accessor: string,
    title: string,
    options: Partial<ColumnDefinition> = {}
): ColumnDefinition => {
    return {
        accessor,
        title,
        sortable: true,
        hidden: false,
        draggable: true,
        width: 150,
        minWidth: 100,
        maxWidth: 300,
        textAlign: 'left',
        ellipsis: true,
        wrap: false,
        ...options,
    };
};

// Predefined column types for common use cases
export const columnTypes = {
    // Text columns with ellipsis for long content
    text: (accessor: string, title: string, options: Partial<ColumnDefinition> = {}) =>
        createColumn(accessor, title, {
            width: 200,
            maxWidth: 300,
            ellipsis: true,
            ...options,
        }),

    // Short text columns
    shortText: (accessor: string, title: string, options: Partial<ColumnDefinition> = {}) =>
        createColumn(accessor, title, {
            width: 120,
            maxWidth: 150,
            ellipsis: true,
            ...options,
        }),

    // Email columns
    email: (accessor: string, title: string, options: Partial<ColumnDefinition> = {}) =>
        createColumn(accessor, title, {
            width: 250,
            maxWidth: 350,
            ellipsis: true,
            ...options,
        }),

    // Date columns
    date: (accessor: string, title: string, options: Partial<ColumnDefinition> = {}) =>
        createColumn(accessor, title, {
            width: 120,
            maxWidth: 150,
            textAlign: 'center',
            ...options,
        }),

    // Status columns
    status: (accessor: string, title: string, options: Partial<ColumnDefinition> = {}) =>
        createColumn(accessor, title, {
            width: 100,
            maxWidth: 120,
            textAlign: 'center',
            ...options,
        }),

    // Number columns
    number: (accessor: string, title: string, options: Partial<ColumnDefinition> = {}) =>
        createColumn(accessor, title, {
            width: 100,
            maxWidth: 120,
            textAlign: 'right',
            ...options,
        }),

    // Boolean columns
    boolean: (accessor: string, title: string, options: Partial<ColumnDefinition> = {}) =>
        createColumn(accessor, title, {
            width: 80,
            maxWidth: 100,
            textAlign: 'center',
            ...options,
        }),

    // Action columns
    actions: (accessor: string, title: string, options: Partial<ColumnDefinition> = {}) =>
        createColumn(accessor, title, {
            width: 120,
            maxWidth: 150,
            textAlign: 'center',
            sortable: false,
            ...options,
        }),

    // ID columns
    id: (accessor: string, title: string, options: Partial<ColumnDefinition> = {}) =>
        createColumn(accessor, title, {
            width: 80,
            maxWidth: 100,
            textAlign: 'center',
            ...options,
        }),
};

// Helper function to create responsive columns
export const createResponsiveColumns = (
    columns: ColumnDefinition[],
    breakpoint: 'sm' | 'md' | 'lg' | 'xl' = 'md'
): ColumnDefinition[] => {
    return columns.map(col => {
        // Adjust column widths based on breakpoint
        const responsiveWidths = {
            sm: { width: col.width ? Math.min(Number(col.width) * 0.8, 120) : 120 },
            md: { width: col.width || 150 },
            lg: { width: col.width ? Math.max(Number(col.width) * 1.1, 150) : 180 },
            xl: { width: col.width ? Math.max(Number(col.width) * 1.2, 180) : 200 },
        };

        return {
            ...col,
            ...responsiveWidths[breakpoint],
        };
    });
};

// Helper function to validate column configuration
export const validateColumns = (columns: ColumnDefinition[]): string[] => {
    const errors: string[] = [];

    columns.forEach((col, index) => {
        if (!col.accessor) {
            errors.push(`Column ${index}: Missing accessor`);
        }
        if (!col.title) {
            errors.push(`Column ${index}: Missing title`);
        }
        if (col.width && typeof col.width === 'number' && col.width < 50) {
            errors.push(`Column ${index}: Width too small (${col.width}px)`);
        }
        if (col.maxWidth && col.width && Number(col.maxWidth) < Number(col.width)) {
            errors.push(`Column ${index}: Max width (${col.maxWidth}) is less than width (${col.width})`);
        }
    });

    return errors;
};

// Helper function to get optimal column widths based on content
export const calculateOptimalWidths = (
    data: any[],
    columns: ColumnDefinition[]
): ColumnDefinition[] => {
    return columns.map(col => {
        const values = data.map(item => {
            const value = getNestedValue(item, col.accessor);
            return value ? String(value).length : 0;
        });

        const maxLength = Math.max(...values, col.title.length);
        const optimalWidth = Math.max(100, Math.min(300, maxLength * 8 + 50));

        return {
            ...col,
            width: optimalWidth,
            maxWidth: Math.max(optimalWidth, 200),
        };
    });
};

// Helper function to get nested object values
const getNestedValue = (obj: any, path: string): any => {
    const parts = path.split('.');
    if (parts.length === 1) return obj?.[path];

    const [first, ...rest] = parts;
    const restPath = rest.join('.');
    return obj?.[first] ? getNestedValue(obj[first], restPath) : undefined;
};

// Export the helper functions
export { getNestedValue }; 