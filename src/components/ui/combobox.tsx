'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: ComboboxOption[];
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
}

export function Combobox({
  name,
  value,
  onChange,
  options,
  placeholder = 'Type to search...',
  emptyMessage = 'No results found',
  className = '',
  disabled = false,
}: ComboboxProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Find the label for the current value
  const currentLabel = value ? (options.find(o => o.value === value)?.label || value) : '';

  // Filter options based on query
  const filtered = query
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        o.value.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
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

  const selectOption = useCallback((optionValue: string) => {
    // Create a synthetic event that mimics a select onChange
    const syntheticEvent = {
      target: {
        name,
        value: optionValue,
        type: 'select-one',
      },
    } as unknown as React.ChangeEvent<HTMLSelectElement>;
    onChange(syntheticEvent);
    setOpen(false);
    setQuery('');
    setHighlighted(-1);
  }, [name, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Backspace' && !query && value) {
        selectOption('');
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlighted(prev => Math.min(prev + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlighted(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlighted >= 0 && filtered[highlighted]) {
          selectOption(filtered[highlighted].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        setQuery('');
        setHighlighted(-1);
        break;
      case 'Tab':
        setOpen(false);
        setQuery('');
        break;
    }
  };

  const showDropdown = open && (filtered.length > 0 || query.length > 0);

  return (
    <div ref={wrapperRef} className={`relative ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Input field */}
      <div className="relative">
        <input
          type="text"
          value={open ? query : currentLabel}
          onChange={(e) => {
            if (!open) setOpen(true);
            setQuery(e.target.value);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery('');
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`${className} pr-8`}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
        />
        {/* Right side: clear button + dropdown arrow */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {value && !open && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                selectOption('');
              }}
              className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              tabIndex={-1}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 max-h-56 overflow-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400 dark:text-slate-500 text-center">
              {emptyMessage}
            </div>
          ) : (
            <ul ref={listRef} role="listbox" className="py-1">
              {filtered.map((option, idx) => (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent blur
                    selectOption(option.value);
                  }}
                  onMouseEnter={() => setHighlighted(idx)}
                  className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
                    option.value === value
                      ? 'bg-[#0B1D3E]/10 dark:bg-[#4a7ab5]/20 text-[#0B1D3E] dark:text-[#4a7ab5] font-medium'
                      : idx === highlighted
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {option.value !== option.label && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 mr-2 font-mono">{option.value}</span>
                  )}
                  {option.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
