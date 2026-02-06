import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from './ui';

interface LightboxImage {
  src: string;
  alt?: string;
  title?: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (index: number) => void;
}

export function ImageLightbox({ 
  images, 
  currentIndex, 
  isOpen, 
  onClose,
  onNavigate 
}: ImageLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const currentImage = images[currentIndex];

  // Reset zoom and position when image changes
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (currentIndex > 0) onNavigate?.(currentIndex - 1);
          break;
        case 'ArrowRight':
          if (currentIndex < images.length - 1) onNavigate?.(currentIndex + 1);
          break;
        case '+':
        case '=':
          setZoom(z => Math.min(z + 0.5, 4));
          break;
        case '-':
          setZoom(z => Math.max(z - 0.5, 0.5));
          break;
        case '0':
          setZoom(1);
          setPosition({ x: 0, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length, onClose, onNavigate]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [zoom, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.max(0.5, Math.min(4, z + delta)));
  }, []);

  if (!isOpen || !currentImage) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[300] bg-black/95 flex flex-col"
      onClick={onClose}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 text-white">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            {currentIndex + 1} / {images.length}
          </span>
          {currentImage.title && (
            <span className="text-sm text-white/70">{currentImage.title}</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <button
            onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(0.5, z - 0.5)); }}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <span className="text-sm min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(4, z + 0.5)); }}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          
          {/* Download */}
          <a
            href={currentImage.src}
            download
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors ml-4"
            title="Download"
          >
            <Download className="h-5 w-5" />
          </a>
          
          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors ml-2"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div 
        className="flex-1 flex items-center justify-center overflow-hidden relative"
        onClick={onClose}
      >
        {/* Navigation Arrows */}
        {currentIndex > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate?.(currentIndex - 1); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white z-10"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}
        
        {currentIndex < images.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate?.(currentIndex + 1); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white z-10"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        )}

        {/* Image */}
        <img
          src={currentImage.src}
          alt={currentImage.alt || ''}
          className={cn(
            "max-w-[90%] max-h-[80vh] object-contain transition-transform duration-200",
            isDragging && "cursor-grabbing",
            zoom > 1 && "cursor-grab"
          )}
          style={{
            transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
            transformOrigin: 'center center'
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          draggable={false}
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="px-6 py-4 flex gap-2 overflow-x-auto">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); onNavigate?.(idx); }}
              className={cn(
                "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                idx === currentIndex 
                  ? "border-white opacity-100" 
                  : "border-transparent opacity-50 hover:opacity-75"
              )}
            >
              <img 
                src={img.src} 
                alt={img.alt || ''}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="px-6 py-2 text-center text-white/50 text-xs">
        Use arrow keys to navigate • +/- to zoom • 0 to reset • Escape to close
      </div>
    </div>,
    document.body
  );
}

// Hook for managing lightbox state
export function useImageLightbox() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [images, setImages] = useState<LightboxImage[]>([]);

  const openLightbox = (imgs: LightboxImage[], startIndex = 0) => {
    setImages(imgs);
    setCurrentIndex(startIndex);
    setIsOpen(true);
  };

  const closeLightbox = () => {
    setIsOpen(false);
  };

  const navigateTo = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(images.length - 1, index)));
  };

  return {
    isOpen,
    currentIndex,
    images,
    openLightbox,
    closeLightbox,
    navigateTo
  };
}

export default ImageLightbox;
