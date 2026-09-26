import React from 'react';
import { LoadingState } from './LoadingState.js';
import { EmptyState } from './EmptyState.js';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T> {
  columns: readonly Column<T>[];
  data: readonly T[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items to display right now.',
  className = '',
  onRowClick,
}: DataTableProps<T>): React.ReactElement {
  if (isLoading) {
    return <LoadingState label="Loading data..." className="py-12" />;
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} className="my-4" />;
  }

  return (
    <div className={`overflow-x-auto rounded-xl border border-stone-200 bg-white ${className}`}>
      <table className="w-full text-left text-sm text-stone-700 divide-y divide-stone-200">
        <thead className="bg-stone-50 text-xs uppercase font-semibold text-stone-500 tracking-wider">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-4 py-3 ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                } ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 bg-white">
          {data.map((item) => {
            const rowKey = keyExtractor(item);
            return (
              <tr
                key={rowKey}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                className={`transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-stone-50/80 active:bg-stone-100' : 'hover:bg-stone-50/40'
                }`}
              >
                {columns.map((col) => {
                  const content = col.render
                    ? col.render(item)
                    : (item as Record<string, unknown>)[col.key] != null
                    ? String((item as Record<string, unknown>)[col.key])
                    : '-';

                  return (
                    <td
                      key={col.key}
                      className={`px-4 py-3 whitespace-nowrap text-stone-800 ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      } ${col.className ?? ''}`}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
