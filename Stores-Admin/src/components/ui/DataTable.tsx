import React from 'react';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
}

function DataTable<T extends object>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No records',
}: DataTableProps<T>) {
  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (!data.length) {
    return <div className="p-4 text-center text-gray-500">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto bg-white rounded shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                className="px-4 py-3 text-left"
                style={col.width ? { width: col.width } : {}}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((row, ri) => (
            <tr key={ri} className="hover:bg-gray-50">
              {columns.map((col, ci) => {
                const cell =
                  typeof col.accessor === 'function'
                    ? col.accessor(row)
                    : (row as any)[col.accessor];
                return (
                  <td key={ci} className="px-4 py-3">
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable; 