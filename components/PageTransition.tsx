/**
 * PageTransition Component
 * Provides smooth animated transitions between pages
 * Uses CSS animations for fade, slide, and scale effects
 */

import React, { useState, useEffect, useRef } from 'react';
import { cn } from './ui';

type TransitionType = 'fade' | 'slide-up' | 'slide-left' | 'slide-right' | 'scale' | 'fade-slide';

interface PageTransitionProps {
  children: React.ReactNode;
  /** Unique key for the current page - changes trigger transition */
  pageKey: string;
  /** Type of transition animation */
  transition?: TransitionType;
  /** Duration of the transition in milliseconds */
  duration?: number;
  /** Additional className for the container */
  className?: string;
}

export function PageTransition({
  children,
  pageKey,
  transition = 'fade-slide',
  duration = 200,
  className
}: PageTransitionProps) {
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionStage, setTransitionStage] = useState<'enter' | 'exit'>('enter');
  const prevKeyRef = useRef(pageKey);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (prevKeyRef.current !== pageKey) {
      // Page is changing - start exit transition
      setIsTransitioning(true);
      setTransitionStage('exit');

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // After exit animation, swap content and enter
      timeoutRef.current = setTimeout(() => {
        setDisplayedChildren(children);
        setTransitionStage('enter');
        
        // After enter animation, complete transition
        timeoutRef.current = setTimeout(() => {
          setIsTransitioning(false);
          prevKeyRef.current = pageKey;
        }, duration);
      }, duration);
    } else {
      // Same page, just update children
      setDisplayedChildren(children);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pageKey, children, duration]);

  const getTransitionClasses = () => {
    const base = 'transition-all ease-out';
    const durationClass = `duration-[${duration}ms]`;

    if (!isTransitioning) {
      return cn(base, 'opacity-100 translate-x-0 translate-y-0 scale-100');
    }

    switch (transition) {
      case 'fade':
        return cn(
          base,
          durationClass,
          transitionStage === 'exit' ? 'opacity-0' : 'opacity-100'
        );

      case 'slide-up':
        return cn(
          base,
          durationClass,
          transitionStage === 'exit' 
            ? 'opacity-0 -translate-y-4' 
            : 'opacity-100 translate-y-0'
        );

      case 'slide-left':
        return cn(
          base,
          durationClass,
          transitionStage === 'exit' 
            ? 'opacity-0 -translate-x-4' 
            : 'opacity-100 translate-x-0'
        );

      case 'slide-right':
        return cn(
          base,
          durationClass,
          transitionStage === 'exit' 
            ? 'opacity-0 translate-x-4' 
            : 'opacity-100 translate-x-0'
        );

      case 'scale':
        return cn(
          base,
          durationClass,
          transitionStage === 'exit' 
            ? 'opacity-0 scale-95' 
            : 'opacity-100 scale-100'
        );

      case 'fade-slide':
      default:
        return cn(
          base,
          durationClass,
          transitionStage === 'exit' 
            ? 'opacity-0 translate-y-2' 
            : 'opacity-100 translate-y-0'
        );
    }
  };

  return (
    <div 
      className={cn(
        'page-transition-container',
        getTransitionClasses(),
        className
      )}
      style={{ 
        transitionDuration: `${duration}ms`,
        willChange: isTransitioning ? 'opacity, transform' : 'auto'
      }}
    >
      {displayedChildren}
    </div>
  );
}

/**
 * Simpler transition wrapper using CSS animations
 * Good for when you just need a quick fade-in on mount
 */
interface AnimatedPageProps {
  children: React.ReactNode;
  className?: string;
  animation?: 'fade-in' | 'slide-in-up' | 'slide-in-right' | 'scale-in' | 'fade-in-up';
}

export function AnimatedPage({ 
  children, 
  className,
  animation = 'fade-in-up'
}: AnimatedPageProps) {
  const animationClasses: Record<string, string> = {
    'fade-in': 'animate-in fade-in duration-300',
    'slide-in-up': 'animate-in slide-in-from-bottom-4 duration-300',
    'slide-in-right': 'animate-in slide-in-from-right-4 duration-300',
    'scale-in': 'animate-in zoom-in-95 duration-300',
    'fade-in-up': 'animate-in fade-in slide-in-from-bottom-2 duration-300'
  };

  return (
    <div className={cn(animationClasses[animation], className)}>
      {children}
    </div>
  );
}

/**
 * Staggered children animation
 * Each child animates in sequence with a delay
 */
interface StaggeredListProps {
  children: React.ReactNode[];
  /** Delay between each child in milliseconds */
  staggerDelay?: number;
  /** Base delay before first item in milliseconds */
  baseDelay?: number;
  className?: string;
  itemClassName?: string;
}

export function StaggeredList({
  children,
  staggerDelay = 50,
  baseDelay = 0,
  className,
  itemClassName
}: StaggeredListProps) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          className={cn(
            'animate-in fade-in slide-in-from-bottom-2',
            itemClassName
          )}
          style={{
            animationDelay: `${baseDelay + index * staggerDelay}ms`,
            animationFillMode: 'both'
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

/**
 * Cross-fade transition between two states
 * Useful for swapping content within the same container
 */
interface CrossFadeProps {
  /** Unique key to trigger transition */
  transitionKey: string;
  children: React.ReactNode;
  duration?: number;
  className?: string;
}

export function CrossFade({
  transitionKey,
  children,
  duration = 200,
  className
}: CrossFadeProps) {
  const [currentKey, setCurrentKey] = useState(transitionKey);
  const [displayChildren, setDisplayChildren] = useState(children);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (transitionKey !== currentKey) {
      // Fade out
      setIsVisible(false);
      
      setTimeout(() => {
        setDisplayChildren(children);
        setCurrentKey(transitionKey);
        // Fade in
        setIsVisible(true);
      }, duration);
    } else {
      setDisplayChildren(children);
    }
  }, [transitionKey, children, currentKey, duration]);

  return (
    <div
      className={cn(
        'transition-opacity',
        isVisible ? 'opacity-100' : 'opacity-0',
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {displayChildren}
    </div>
  );
}

export default PageTransition;
