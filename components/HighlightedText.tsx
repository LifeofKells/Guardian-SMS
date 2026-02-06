import React from 'react';
import { cn } from './ui';

interface HighlightedTextProps {
  text: string;
  searchTerm: string;
  className?: string;
  highlightClassName?: string;
  caseSensitive?: boolean;
}

export function HighlightedText({ 
  text, 
  searchTerm,
  className = '',
  highlightClassName = 'bg-yellow-200 text-yellow-900',
  caseSensitive = false
}: HighlightedTextProps) {
  if (!searchTerm.trim()) {
    return <span className={className}>{text}</span>;
  }

  const searchLower = caseSensitive ? searchTerm : searchTerm.toLowerCase();
  const textLower = caseSensitive ? text : text.toLowerCase();
  
  const parts: { text: string; isMatch: boolean }[] = [];
  let lastIndex = 0;
  let index = textLower.indexOf(searchLower);

  while (index !== -1) {
    // Add text before match
    if (index > lastIndex) {
      parts.push({
        text: text.slice(lastIndex, index),
        isMatch: false
      });
    }

    // Add matched text
    parts.push({
      text: text.slice(index, index + searchTerm.length),
      isMatch: true
    });

    lastIndex = index + searchTerm.length;
    index = textLower.indexOf(searchLower, lastIndex);
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      text: text.slice(lastIndex),
      isMatch: false
    });
  }

  return (
    <span className={className}>
      {parts.map((part, i) => (
        part.isMatch ? (
          <mark 
            key={i} 
            className={cn(
              "rounded px-0.5 font-medium",
              highlightClassName
            )}
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      ))}
    </span>
  );
}

interface SearchHighlightProps {
  children: string;
  searchTerm: string;
}

// Wrapper that works with children
export function SearchHighlight({ children, searchTerm }: SearchHighlightProps) {
  return (
    <HighlightedText 
      text={children} 
      searchTerm={searchTerm}
    />
  );
}

export default HighlightedText;
