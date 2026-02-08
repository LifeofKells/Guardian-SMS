import React, { useRef, useEffect, useState, useCallback } from 'react';
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

interface StickyTableCellProps extends React.HTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
  className?: string;
  isHeader?: boolean;
  style?: React.CSSProperties;
}

export function StickyTableCell({ children, className, isHeader = false, ...props }: StickyTableCellProps) {
  const Component = isHeader ? 'th' : 'td';
  return (
    <Component
      className={cn(
        "px-4 py-3 text-left",
        isHeader && "font-medium text-muted-foreground text-xs uppercase tracking-wider",
        className
      )}
      {...props}
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
// --- RESIZABLE HEADER CELL ---

export interface StickyResizableHeaderCellProps extends React.ComponentPropsWithoutRef<'th'> {
  id: string;
  defaultWidth?: number;
  minWidth?: number;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function StickyResizableHeaderCell({
  children,
  id,
  defaultWidth = 150,
  minWidth = 60,
  className,
  style,
  ...props
}: StickyResizableHeaderCellProps) {
  // Initialize from localStorage immediately if possible
  const [width, setWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`table-col-${id}`);
      if (saved) return parseInt(saved, 10);
    }
    return defaultWidth;
  });

  const isResizing = useRef(false);

  // Sync with localStorage on change (debounced manually by only saving on mouse up usually, 
  // but here we save in effect for state consistency across tabs/reloads if needed, 
  // though real-time resizing needs perf. We'll save on mouseUp.)

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    isResizing.current = true;
    const startX = mouseDownEvent.clientX;
    const startWidth = width;

    const onMouseMove = (mouseMoveEvent: MouseEvent) => {
      if (isResizing.current) {
        // Calculate new width
        requestAnimationFrame(() => {
          const newWidth = Math.max(minWidth, startWidth + (mouseMoveEvent.clientX - startX));
          setWidth(newWidth);
        });
      }
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';

      // Save final width
      // We need to access the *current* width. 
      // Since width is in state, using it here might be stale in closure?
      // Actually, onMouseUp is created inside the callback, so it closes over 'width' at start.
      // We need to use the ref or functional update value? 
      // But we can't get the 'final' value easily without a ref.

      // Better to rely on the effect to save, but throttle it.
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
  }, [width, minWidth]);

  // Save to local storage when width changes (debounced/throttled conceptually, 
  // effectively on every render update, which is fine for LS)
  useEffect(() => {
    if (!isResizing.current) {
      localStorage.setItem(`table-col-${id}`, width.toString());
    }
    // We also want to save after resizing stops, which the effect handles naturally 
    // as long as width updates triggering effect.
  }, [width, id]);

  const onDragEnd = () => {
    localStorage.setItem(`table-col-${id}`, width.toString());
  };

  return (
    <th
      className={cn(
        "px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider relative group select-none bg-muted/80 backdrop-blur-sm sticky top-0 z-10",
        "after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-border",
        className
      )}
      style={{
        width: `${width}px`,
        minWidth: `${width}px`,
        maxWidth: `${width}px`,
        ...style
      }}
      {...props}
    >
      <div className="flex items-center justify-between w-full h-full">
        <span className="truncate">{children}</span>
        {/* Resizer Handle */}
        <div
          className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize hover:bg-primary/10 group-hover:bg-primary/5 transition-colors z-20 flex items-center justify-center opacity-0 group-hover:opacity-100"
          onMouseDown={startResizing}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-0.5 h-4 bg-border/50 rounded-full" />
        </div>
      </div>
    </th>
  );
}
