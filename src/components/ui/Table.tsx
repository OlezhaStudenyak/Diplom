import React from 'react';

interface TableProps {
  headers: {
    key: string;
    label: React.ReactNode;
    className?: string;
  }[];
  data: Record<string, any>[];
  renderRow: (item: Record<string, any>, index: number) => React.ReactNode[];
  className?: string;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (item: Record<string, any>, index: number) => void;
  keyExtractor?: (item: Record<string, any>, index: number) => string;
}

const Table: React.FC<TableProps> = ({
  headers,
  data,
  renderRow,
  className = '',
  isLoading = false,
  emptyState,
  onRowClick,
  keyExtractor = (item, index) => `table-row-${index}`,
}) => {
  const isEmpty = !isLoading && data.length === 0;

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-neutral-200">
        <thead className="bg-neutral-50">
          <tr>
            {headers.map((header) => (
              <th
                key={header.key}
                scope="col"
                className={`
                  px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider
                  ${header.className || ''}
                `}
              >
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-neutral-200">
          {isLoading ? (
            <tr>
              <td colSpan={headers.length} className="px-6 py-4">
                <div className="flex justify-center items-center">
                  <svg className="animate-spin h-5 w-5 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              </td>
            </tr>
          ) : isEmpty ? (
            <tr>
              <td colSpan={headers.length} className="px-6 py-8 text-center text-sm text-neutral-500">
                {emptyState || 'No data available'}
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr 
                key={keyExtractor(item, index)} 
                className={onRowClick ? 'hover:bg-neutral-50 cursor-pointer transition-colors' : ''}
                onClick={onRowClick ? () => onRowClick(item, index) : undefined}
              >
                {renderRow(item, index).map((cell, cellIndex) => (
                  <td 
                    key={`${keyExtractor(item, index)}-cell-${cellIndex}`} 
                    className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;