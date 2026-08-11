'use client';

import { useState, useRef, useEffect } from 'react';

interface AutoSuggestInputProps {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function AutoSuggestInput({
  name,
  value,
  onChange,
  suggestions,
  placeholder = 'Type to search...',
  className = '',
  disabled = false,
}: AutoSuggestInputProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter suggestions based on query
  const filtered = query
    ? suggestions.filter((s) =>
        s.toLowerCase().includes(query.toLowerCase())
      )
    : suggestions;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
        setHighlighted(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlighted(-1);
  }, [query]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlighted >= 0 && listRef.current) {
      const el = listRef.current.children[highlighted] as HTMLElement;
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted]);

  const selectSuggestion = (suggestion: string) => {
    const syntheticEvent = {
      target: { name, value: suggestion, type: 'text' },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
    setOpen(false);
    setQuery('');
    setHighlighted(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        if (filtered.length > 0) {
          e.preventDefault();
          setOpen(true);
          setQuery(value);
        }
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlighted((prev) => Math.min(prev + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlighted((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlighted >= 0 && filtered[highlighted]) {
          selectSuggestion(filtered[highlighted]);
        }
        // If no highlight, keep the typed value as-is (close dropdown)
        else {
          // Commit the typed query as the value
          const syntheticEvent = {
            target: { name, value: query, type: 'text' },
          } as unknown as React.ChangeEvent<HTMLInputElement>;
          onChange(syntheticEvent);
          setOpen(false);
          setQuery('');
          setHighlighted(-1);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        setQuery('');
        setHighlighted(-1);
        break;
      case 'Tab':
        // Commit typed value on tab out
        if (query) {
          const syntheticEvent = {
            target: { name, value: query, type: 'text' },
          } as unknown as React.ChangeEvent<HTMLInputElement>;
          onChange(syntheticEvent);
        }
        setOpen(false);
        setQuery('');
        break;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    // Update the form value in real-time as user types
    const syntheticEvent = {
      target: { name, value: val, type: 'text' },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
  };

  const showDropdown = open && (filtered.length > 0 || query.length > 0);

  return (
    <div ref={wrapperRef} className={`relative ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <input
        type="text"
        value={open ? query : value}
        onChange={handleInputChange}
        onFocus={() => {
          setOpen(true);
          setQuery(value);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
      />
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 max-h-56 overflow-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400 dark:text-slate-500 text-center">
              No matching suggestions
            </div>
          ) : (
            <ul ref={listRef} role="listbox" className="py-1">
              {filtered.map((suggestion, idx) => (
                <li
                  key={suggestion}
                  role="option"
                  aria-selected={suggestion === value}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectSuggestion(suggestion);
                  }}
                  onMouseEnter={() => setHighlighted(idx)}
                  className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
                    suggestion === value
                      ? 'bg-[#0B1D3E]/10 dark:bg-[#4a7ab5]/20 text-[#0B1D3E] dark:text-[#4a7ab5] font-medium'
                      : idx === highlighted
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
