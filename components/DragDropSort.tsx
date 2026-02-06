/**
 * DragDropSort Component
 * Reorder items by dragging with visual feedback
 */

import React, { useState, useRef, useEffect } from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from './ui';

interface DragDropItem {
  id: string;
  content: React.ReactNode;
}

interface DragDropSortProps {
  items: DragDropItem[];
  onReorder: (items: DragDropItem[]) => void;
  className?: string;
  itemClassName?: string;
  dragHandle?: boolean;
}

export function DragDropSort({ 
  items, 
  onReorder, 
  className,
  itemClassName,
  dragHandle = true
}: DragDropSortProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [orderedItems, setOrderedItems] = useState(items);
  const dragItemRef = useRef<number | null>(null);
  const dragOverItemRef = useRef<number | null>(null);

  useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  const handleDragStart = (e: React.DragEvent, index: number, id: string) => {
    dragItemRef.current = index;
    setDraggingId(id);
    
    // Set drag image
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    // Create ghost element
    const ghost = (e.target as HTMLElement).cloneNode(true) as HTMLElement;
    ghost.style.position = 'fixed';
    ghost.style.top = '-1000px';
    ghost.style.opacity = '0.8';
    ghost.style.transform = 'rotate(3deg) scale(1.02)';
    ghost.style.width = `${rect.width}px`;
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '9999';
    document.body.appendChild(ghost);
    
    e.dataTransfer.setDragImage(ghost, offsetX, offsetY);
    e.dataTransfer.effectAllowed = 'move';
    
    setTimeout(() => {
      document.body.removeChild(ghost);
    }, 0);
  };

  const handleDragEnter = (e: React.DragEvent, index: number, id: string) => {
    e.preventDefault();
    dragOverItemRef.current = index;
    setDragOverId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're actually leaving the item, not entering a child
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverId(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    const dragItemIndex = dragItemRef.current;
    const dragOverItemIndex = dragOverItemRef.current;

    if (dragItemIndex === null || dragOverItemIndex === null) return;
    if (dragItemIndex === dragOverItemIndex) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    const newItems = [...orderedItems];
    const draggedItem = newItems[dragItemIndex];
    
    // Remove from original position
    newItems.splice(dragItemIndex, 1);
    // Insert at new position
    newItems.splice(dragOverItemIndex, 0, draggedItem);
    
    setOrderedItems(newItems);
    onReorder(newItems);
    
    dragItemRef.current = null;
    dragOverItemRef.current = null;
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    dragItemRef.current = null;
    dragOverItemRef.current = null;
    setDraggingId(null);
    setDragOverId(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {orderedItems.map((item, index) => (
        <div
          key={item.id}
          draggable
          onDragStart={(e) => handleDragStart(e, index, item.id)}
          onDragEnter={(e) => handleDragEnter(e, index, item.id)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          className={cn(
            "relative flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 cursor-move",
            "bg-background hover:border-primary/50 hover:shadow-sm",
            draggingId === item.id && "opacity-50 rotate-1 scale-[1.02] shadow-lg border-primary",
            dragOverId === item.id && draggingId !== item.id && "border-primary border-2 bg-primary/5 scale-[1.01]",
            itemClassName
          )}
        >
          {dragHandle && (
            <div className="text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5" />
            </div>
          )}
          <div className="flex-1">
            {item.content}
          </div>
        </div>
      ))}
    </div>
  );
}

// Simplified sortable list for common use cases
interface SimpleSortableListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemId: (item: T) => string;
  onReorder: (items: T[]) => void;
  className?: string;
}

export function SimpleSortableList<T>({ 
  items, 
  renderItem, 
  getItemId, 
  onReorder,
  className 
}: SimpleSortableListProps<T>) {
  const dragDropItems: DragDropItem[] = items.map((item, index) => ({
    id: getItemId(item),
    content: renderItem(item, index)
  }));

  const handleReorder = (newItems: DragDropItem[]) => {
    const reorderedData = newItems.map(ddItem => 
      items.find(item => getItemId(item) === ddItem.id)!
    );
    onReorder(reorderedData);
  };

  return (
    <DragDropSort 
      items={dragDropItems} 
      onReorder={handleReorder}
      className={className}
    />
  );
}

export default DragDropSort;
