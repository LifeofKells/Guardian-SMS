/**
 * AnimatedDarkModeToggle Component
 * Smooth sun-to-moon animation when switching themes
 */

import React, { useState, useEffect } from 'react';
import { cn } from './ui';

interface AnimatedDarkModeToggleProps {
  isDark: boolean;
  onToggle: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AnimatedDarkModeToggle({ 
  isDark, 
  onToggle, 
  className,
  size = 'md'
}: AnimatedDarkModeToggleProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    onToggle();
    
    // Reset animation state after transition
    setTimeout(() => {
      setIsAnimating(false);
    }, 500);
  };

  const sizes = {
    sm: 'w-12 h-6',
    md: 'w-16 h-8',
    lg: 'w-20 h-10'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "relative rounded-full transition-colors duration-500 ease-spring",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        "hover:scale-105 active:scale-95",
        isDark ? "bg-slate-800" : "bg-sky-200",
        sizes[size],
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden rounded-full">
        {/* Stars (visible in dark mode) */}
        <div className={cn(
          "absolute top-1 right-2 transition-all duration-500",
          isDark ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        )}>
          <svg className="w-1 h-1 text-white" viewBox="0 0 10 10">
            <circle cx="5" cy="5" r="2" fill="currentColor" />
          </svg>
        </div>
        <div className={cn(
          "absolute top-3 right-4 transition-all duration-500 delay-75",
          isDark ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        )}>
          <svg className="w-0.5 h-0.5 text-white" viewBox="0 0 10 10">
            <circle cx="5" cy="5" r="1.5" fill="currentColor" />
          </svg>
        </div>
        <div className={cn(
          "absolute bottom-2 right-3 transition-all duration-500 delay-100",
          isDark ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        )}>
          <svg className="w-1 h-1 text-white" viewBox="0 0 10 10">
            <circle cx="5" cy="5" r="1" fill="currentColor" />
          </svg>
        </div>

        {/* Clouds (visible in light mode) */}
        <div className={cn(
          "absolute -bottom-1 left-2 transition-all duration-500",
          !isDark ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
        )}>
          <svg className="w-6 h-4 text-white/80" viewBox="0 0 24 16">
            <ellipse cx="8" cy="10" rx="6" ry="4" fill="currentColor" />
            <ellipse cx="14" cy="8" rx="5" ry="3.5" fill="currentColor" />
            <ellipse cx="18" cy="11" rx="4" ry="3" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Toggle Circle with Sun/Moon */}
      <div
        className={cn(
          "absolute top-0.5 transition-all duration-500 ease-spring",
          "flex items-center justify-center rounded-full shadow-md",
          iconSizes[size],
          isDark 
            ? "left-[calc(100%-0.25rem)] -translate-x-full bg-slate-700" 
            : "left-0.5 bg-yellow-300",
          isAnimating && "scale-110"
        )}
      >
        {isDark ? (
          // Moon Icon
          <svg
            className={cn(
              "text-slate-200 transition-transform duration-500",
              isAnimating && "rotate-12"
            )}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          // Sun Icon
          <svg
            className={cn(
              "text-yellow-600 transition-transform duration-500",
              isAnimating && "rotate-180"
            )}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        )}
      </div>

      {/* Glow Effect */}
      <div
        className={cn(
          "absolute inset-0 rounded-full transition-opacity duration-500",
          "blur-md -z-10",
          isDark ? "opacity-20 bg-slate-600" : "opacity-30 bg-yellow-400"
        )}
      />
    </button>
  );
}

// Alternative circular button style
interface CircularDarkModeToggleProps {
  isDark: boolean;
  onToggle: () => void;
  className?: string;
}

export function CircularDarkModeToggle({ 
  isDark, 
  onToggle, 
  className 
}: CircularDarkModeToggleProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    onToggle();
    setTimeout(() => setIsAnimating(false), 600);
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "relative w-12 h-12 rounded-full overflow-hidden",
        "transition-all duration-500 ease-spring",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        "hover:scale-110 active:scale-95",
        isDark ? "bg-slate-800" : "bg-sky-100",
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Background Animation */}
      <div
        className={cn(
          "absolute inset-0 transition-all duration-700 ease-spring",
          isDark 
            ? "bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950" 
            : "bg-gradient-to-br from-sky-300 via-blue-200 to-yellow-100"
        )}
      />

      {/* Stars (Dark Mode) */}
      <div className="absolute inset-0">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute w-1 h-1 bg-white rounded-full transition-all duration-700",
              isDark ? "opacity-100 scale-100" : "opacity-0 scale-0"
            )}
            style={{
              top: `${20 + i * 15}%`,
              left: `${15 + (i * 20) % 60}%`,
              transitionDelay: `${i * 50}ms`
            }}
          />
        ))}
      </div>

      {/* Icon Container */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={cn(
            "relative w-6 h-6 transition-all duration-500 ease-spring",
            isAnimating && "scale-125"
          )}
        >
          {/* Sun */}
          <svg
            className={cn(
              "absolute inset-0 w-full h-full transition-all duration-500",
              "text-yellow-500",
              isDark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"
            )}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <circle cx="12" cy="12" r="5" />
            <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </g>
          </svg>

          {/* Moon */}
          <svg
            className={cn(
              "absolute inset-0 w-full h-full transition-all duration-500",
              "text-slate-300",
              isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"
            )}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </div>
      </div>

      {/* Glow */}
      <div
        className={cn(
          "absolute -inset-2 rounded-full blur-xl -z-10 transition-all duration-500",
          isDark ? "opacity-20 bg-indigo-500" : "opacity-40 bg-yellow-400"
        )}
      />
    </button>
  );
}

export default AnimatedDarkModeToggle;
