'use client';

import { ReactNode } from 'react';
import { ChevronUp, ChevronDown, ArrowUpDown, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ===== TYPES =====

export type SortDirection = 'asc' | 'desc';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T, isSelected: boolean) => ReactNode;
  className?: string;
  headerClassName?: string;
  width?: string;
}

export interface DataTableBulkAction<T> {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive' | 'outline';
  className?: string;
  action: (selectedRows: T[]) => void | Promise<void>;
}

export interface DataTableProps<T> {
  // Data (already filtered/sorted from parent)
  data: T[];
  columns: DataTableColumn<T>[];
  keyField?: keyof T;

  // Search (controlled)
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;

  // Toolbar Filters
  toolbarFilters?: ReactNode;

  // Advanced Filters
  advancedFilters?: ReactNode;
  showAdvancedFilters?: boolean;
  onToggleAdvancedFilters?: () => void;
  hasActiveAdvancedFilters?: boolean;

  // Sorting (controlled)
  sortField?: string;
  sortDirection?: SortDirection;
  onSort?: (field: string) => void;

  // Selection (controlled)
  selectedRows?: Set<any>;
  onSelectionChange?: (selectedIds: Set<any>) => void;

  // Bulk Actions
  bulkActions?: DataTableBulkAction<T>[];
  bulkActionsPosition?: 'top' | 'inline'; // top = bar above table, inline = in toolbar

  // Export
  exportButton?: ReactNode;

  // Pagination (controlled)
  currentPage?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];

  // Row Actions
  onRowClick?: (row: T, e: React.MouseEvent) => void;
  rowClassName?: (row: T, isSelected: boolean) => string;

  // Empty State
  emptyIcon?: React.ComponentType<{ className?: string }>;
  emptyTitle?: string;
  emptyDescription?: string;

  // Loading
  loading?: boolean;
  loadingText?: string;

  // Mobile
  mobileCard?: (row: T, isSelected: boolean, onSelect: () => void) => ReactNode;

  // Styling
  className?: string;
  tableClassName?: string;
}

// ===== COMPONENT =====

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField = 'id' as keyof T,

  // Search
  searchable = true,
  searchPlaceholder = 'Cerca...',
  searchValue,
  onSearchChange,

  // Toolbar
  toolbarFilters,

  // Advanced Filters
  advancedFilters,
  showAdvancedFilters = false,
  onToggleAdvancedFilters,
  hasActiveAdvancedFilters = false,

  // Sorting
  sortField,
  sortDirection = 'desc',
  onSort,

  // Selection
  selectedRows = new Set(),
  onSelectionChange,

  // Bulk Actions
  bulkActions,
  bulkActionsPosition = 'top',

  // Export
  exportButton,

  // Pagination
  currentPage = 1,
  pageSize = 25,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],

  // Row Actions
  onRowClick,
  rowClassName,

  // Empty State
  emptyIcon: EmptyIcon,
  emptyTitle = 'Nessun dato trovato',
  emptyDescription = 'Non ci sono elementi da visualizzare',

  // Loading
  loading = false,
  loadingText = 'Caricamento...',

  // Mobile
  mobileCard,

  // Styling
  className,
  tableClassName,
}: DataTableProps<T>) {

  // ===== HANDLERS =====

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;

    if (checked) {
      const allKeys = new Set(data.map(row => row[keyField]));
      onSelectionChange(allKeys);
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleSelectRow = (row: T) => {
    if (!onSelectionChange) return;

    const key = row[keyField];
    const newSelected = new Set(selectedRows);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    onSelectionChange(newSelected);
  };

  const handleRowClick = (row: T, e: React.MouseEvent) => {
    // Don't trigger if clicking on checkbox, button, or select
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('[role="checkbox"]') ||
      target.closest('[role="combobox"]') ||
      target.closest('input') ||
      target.closest('select')
    ) {
      return;
    }
    onRowClick?.(row, e);
  };

  const handleSort = (field: string) => {
    onSort?.(field);
  };

  const getSortIcon = (columnKey: string) => {
    if (sortField !== columnKey) {
      return <ArrowUpDown className="h-4 w-4 opacity-30" />;
    }
    return sortDirection === 'asc'
      ? <ChevronUp className="h-4 w-4" />
      : <ChevronDown className="h-4 w-4" />;
  };

  const getSelectedRowsData = (): T[] => {
    return data.filter(row => selectedRows.has(row[keyField]));
  };

  const totalPages = totalItems ? Math.ceil(totalItems / pageSize) : Math.ceil(data.length / pageSize);
  const showPagination = totalPages > 1;

  // ===== RENDER =====
  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search */}
        {searchable && onSearchChange && (
          <div className="flex-1">
            <Input
              placeholder={searchPlaceholder}
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-11 border-2 border-border rounded-sm bg-white"
            />
          </div>
        )}

        {/* Custom Toolbar Filters */}
        {toolbarFilters}

        {/* Advanced Filters Button */}
        {advancedFilters && onToggleAdvancedFilters && (
          <Button
            onClick={onToggleAdvancedFilters}
            variant="outline"
            className="h-11 w-11 border-2 border-border rounded-sm relative bg-white"
            size="icon"
          >
            <Filter className="h-4 w-4" />
            {hasActiveAdvancedFilters && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary"></span>
            )}
          </Button>
        )}

        {/* Export Button */}
        {exportButton}

        {/* Inline Bulk Actions */}
        {bulkActionsPosition === 'inline' && selectedRows.size > 0 && bulkActions && (
          <div className="flex gap-2">
            {bulkActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  size="sm"
                  onClick={() => action.action(getSelectedRowsData())}
                  className={cn("h-11 gap-2", action.className)}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {action.label} ({selectedRows.size})
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && advancedFilters && (
        <div className="border-2 border-border rounded-sm bg-card">
          {advancedFilters}
        </div>
      )}

      {/* Top Bulk Actions Bar */}
      {bulkActionsPosition === 'top' && selectedRows.size > 0 && bulkActions && (
        <div className="flex items-center justify-between p-4 bg-primary/10 border-2 border-primary/20 rounded-sm">
          <span className="text-sm font-medium">
            {selectedRows.size} elemento{selectedRows.size > 1 ? 'i' : ''} selezionat{selectedRows.size > 1 ? 'i' : 'o'}
          </span>
          <div className="flex gap-2">
            {bulkActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  size="sm"
                  onClick={() => action.action(getSelectedRowsData())}
                  className={cn("gap-2", action.className)}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{loadingText}</div>
      ) : data.length === 0 ? (
        /* Empty State */
        <div className="flex items-center justify-center min-h-[400px] rounded-sm border-2 border-dashed border-border bg-card/50">
          <div className="text-center space-y-3">
            {EmptyIcon && <EmptyIcon className="h-12 w-12 text-muted-foreground mx-auto" />}
            <div>
              <h3 className="text-lg font-medium">{emptyTitle}</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {emptyDescription}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block w-full overflow-hidden">
            <table className={cn("w-full border-collapse", tableClassName)}>
              <thead>
                <tr className="bg-gray-100 border-b-2 border-border">
                  {/* Selection Column */}
                  {onSelectionChange && (
                    <th className="px-4 py-6 text-left w-12">
                      <Checkbox
                        checked={selectedRows.size === data.length && data.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                  )}

                  {/* Data Columns */}
                  {columns.map(column => (
                    <th
                      key={column.key}
                      className={cn(
                        "px-4 py-6 text-left text-sm font-semibold text-foreground",
                        column.sortable !== false && onSort && "cursor-pointer hover:bg-gray-200 transition-colors",
                        column.width,
                        column.headerClassName
                      )}
                      onClick={() => column.sortable !== false && onSort && handleSort(column.key)}
                    >
                      <div className="flex items-center gap-2">
                        {column.label}
                        {column.sortable !== false && onSort && getSortIcon(column.key)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row) => {
                  const rowKey = row[keyField];
                  const isSelected = selectedRows.has(rowKey);

                  return (
                    <tr
                      key={rowKey}
                      onClick={(e) => handleRowClick(row, e)}
                      className={cn(
                        "border-b border-border transition-colors",
                        onRowClick && "cursor-pointer hover:bg-primary/10",
                        isSelected && "bg-primary/5",
                        rowClassName?.(row, isSelected)
                      )}
                    >
                      {/* Selection Cell */}
                      {onSelectionChange && (
                        <td className="px-4 py-5">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleSelectRow(row)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                      )}

                      {/* Data Cells */}
                      {columns.map(column => (
                        <td
                          key={column.key}
                          className={cn("px-4 py-5", column.className)}
                        >
                          {column.render ? column.render(row, isSelected) : (
                            <div className="text-sm text-foreground">
                              {row[column.key] ?? '-'}
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          {mobileCard && (
            <div className="lg:hidden space-y-3">
              {data.map((row) => {
                const rowKey = row[keyField];
                const isSelected = selectedRows.has(rowKey);
                return (
                  <div key={rowKey}>
                    {mobileCard(row, isSelected, () => handleSelectRow(row))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalItems && totalItems > 0 && onPageChange && onPageSizeChange && (
            <div className="flex items-center justify-between px-4 py-4 border-t border-border">
              {/* Left side - Info and Items per page */}
              <div className="flex items-center gap-6">
                <span className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalItems)} di {totalItems} elementi
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Elementi per pagina:</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      onPageSizeChange(Number(value));
                      onPageChange(1);
                    }}
                  >
                    <SelectTrigger className="w-20 h-9 rounded-lg border-2 border-border bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {pageSizeOptions.map(size => (
                        <SelectItem key={size} value={size.toString()}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Right side - Page navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="h-9 w-9 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      if (page === 1 || page === totalPages) return true;
                      if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                      return false;
                    })
                    .map((page, index, array) => {
                      const showEllipsis = index > 0 && page - array[index - 1] > 1;
                      return (
                        <div key={page} className="flex items-center gap-1">
                          {showEllipsis && (
                            <span className="px-2 text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => onPageChange(page)}
                            className="h-9 w-9 p-0"
                          >
                            {page}
                          </Button>
                        </div>
                      );
                    })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="h-9 w-9 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
