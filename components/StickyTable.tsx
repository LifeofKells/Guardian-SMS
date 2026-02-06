import React, { useRef, useEffect, useState } from 'react';
import { cn } from './ui';

interface StickyTableContainerProps {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
}

export function StickyTableContainer({ 
  children, 
  className,
  maxHeight = "600px"
}: StickyTableContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsScrolled(container.scrollTop > 0);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "overflow-auto rounded-lg border border-border bg-card",
        isScrolled && "shadow-[inset_0_4px_6px_-1px_rgba(0,0,0,0.1)]",
        className
      )}
      style={{ maxHeight }}
    >
      {children}
    </div>
  );
}

interface StickyTableProps {
  children: React.ReactNode;
  className?: string;
}

export function StickyTable({ children, className }: StickyTableProps) {
  return (
    <table className={cn("w-full text-sm", className)}>
      {children}
    </table>
  );
}

interface StickyTableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function StickyTableHeader({ children, className }: StickyTableHeaderProps) {
  return (
    <thead 
      className={cn(
        "bg-muted/80 backdrop-blur-sm sticky top-0 z-10",
        "after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-border",
        className
      )}
    >
      {children}
    </thead>
  );
}

interface StickyTableRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function StickyTableRow({ children, className, onClick }: StickyTableRowProps) {
  return (
    <tr className={cn("hover:bg-muted/50 transition-colors", className)} onClick={onClick}>
      {children}
    </tr>
  );
}

interface StickyTableCellProps {
  children: React.ReactNode;
  className?: string;
  isHeader?: boolean;
}

export function StickyTableCell({ children, className, isHeader = false }: StickyTableCellProps) {
  const Component = isHeader ? 'th' : 'td';
  return (
    <Component 
      className={cn(
        "px-4 py-3 text-left",
        isHeader && "font-medium text-muted-foreground text-xs uppercase tracking-wider",
        className
      )}
    >
      {children}
    </Component>
  );
}

interface StickyTableBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function StickyTableBody({ children, className }: StickyTableBodyProps) {
  return (
    <tbody className={cn("divide-y divide-border", className)}>
      {children}
    </tbody>
  );
}

// Complete Sticky Table component with all parts
interface TableColumn {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface SimpleStickyTableProps {
  columns: TableColumn[];
  data: any[];
  keyExtractor: (item: any) => string;
  renderCell: (item: any, column: TableColumn) => React.ReactNode;
  className?: string;
  maxHeight?: string;
  emptyMessage?: string;
}

export function SimpleStickyTable({
  columns,
  data,
  keyExtractor,
  renderCell,
  className,
  maxHeight,
  emptyMessage = 'No data available'
}: SimpleStickyTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm border rounded-lg">
        {emptyMessage}
      </div>
    );
  }

  return (
    <StickyTableContainer className={className} maxHeight={maxHeight}>
      <StickyTable>
        <StickyTableHeader>
          <tr>
            {columns.map((column) => (
              <div key={column.key} className="contents">
                <StickyTableCell 
                  isHeader
                  className={cn(
                    column.width && `w-[${column.width}]`,
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                >
                  {column.header}
                </StickyTableCell>
              </div>
            ))}
          </tr>
        </StickyTableHeader>
        <StickyTableBody>
          {data.map((item) => (
            <div key={keyExtractor(item)} className="contents">
              <StickyTableRow>
                {columns.map((column) => (
                  <div key={column.key} className="contents">
                    <StickyTableCell 
                      className={cn(
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                    >
                      {renderCell(item, column)}
                    </StickyTableCell>
                  </div>
                ))}
              </StickyTableRow>
            </div>
          ))}
        </StickyTableBody>
      </StickyTable>
    </StickyTableContainer>
  );
}

export default {
  Container: StickyTableContainer,
  Table: StickyTable,
  Header: StickyTableHeader,
  Body: StickyTableBody,
  Row: StickyTableRow,
  Cell: StickyTableCell,
  Simple: SimpleStickyTable
};
