import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronsUpDown, Check, Search, X, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * SearchableSelect (Combobox) component with debounced live filtering and remote search support.
 * 
 * @param {Object} props
 * @param {Array<{ id?: string|number, value?: string|number, name?: string, label?: string }>} props.options
 * @param {string|number} props.value
 * @param {(value: any, item?: any) => void} props.onChange
 * @param {string} [props.placeholder='Pilih opsi...']
 * @param {string} [props.searchPlaceholder='Cari...']
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.className='']
 * @param {string} [props.emptyMessage='Tidak ada data ditemukan']
 * @param {number} [props.debounceDelay=300]
 * @param {(searchTerm: string) => void} [props.onSearch]
 * @param {boolean} [props.isLoading=false]
 * @param {string} [props.selectedLabel]
 */
export function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Pilih opsi...',
  searchPlaceholder = 'Cari...',
  disabled = false,
  className = '',
  emptyMessage = 'Tidak ada data ditemukan',
  debounceDelay = 300,
  onSearch,
  isLoading = false,
  selectedLabel,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, debounceDelay);
  const activeSearchTerm = searchTerm === '' ? '' : debouncedSearchTerm;
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Keep a stable ref to onSearch to avoid re-triggering effects on parent renders
  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  // Call onSearch when debounced activeSearchTerm changes
  useEffect(() => {
    if (onSearchRef.current) {
      onSearchRef.current(activeSearchTerm);
    }
  }, [activeSearchTerm]);

  // Normalize options to have standard { value, label, raw }
  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      const val = opt.id !== undefined ? opt.id : opt.value;
      const label = opt.name !== undefined ? opt.name : opt.label || String(val);
      return { value: val, label, raw: opt };
    });
  }, [options]);

  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => String(opt.value) === String(value));
  }, [normalizedOptions, value]);

  // Fallback chain for button label:
  // 1. Matched option in current list
  // 2. Explicit selectedLabel passed from parent
  // 3. Current value (if present)
  // 4. null (shows placeholder)
  const displayLabel = selectedOption?.label || selectedLabel || (value ? String(value) : null);

  // Filter options based on search query (if remote onSearch is given, options are already filtered by server)
  const filteredOptions = useMemo(() => {
    if (onSearch) {
      return normalizedOptions;
    }
    const term = activeSearchTerm.trim().toLowerCase();
    if (!term) return normalizedOptions;
    return normalizedOptions.filter((opt) =>
      opt.label.toLowerCase().includes(term)
    );
  }, [normalizedOptions, activeSearchTerm, onSearch]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens and reset search term
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSelect = (itemValue, rawItem) => {
    onChange(itemValue, rawItem);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full h-10 px-3 flex items-center justify-between text-xs rounded-lg border bg-background text-left transition-all ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-muted/40 border-input'
            : isOpen
            ? 'border-primary ring-1 ring-primary/30 shadow-sm'
            : 'border-input hover:border-muted-foreground/40'
        }`}
      >
        <span
          className={`truncate font-medium ${
            displayLabel ? 'text-foreground font-semibold' : 'text-muted-foreground'
          }`}
        >
          {displayLabel || placeholder}
        </span>
        <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1.5 opacity-60" />
      </button>

      {/* Dropdown Popover */}
      {isOpen && !disabled && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full min-w-[200px] rounded-xl border border-border bg-popover text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95 duration-150 overflow-hidden">
          {/* Search Box */}
          <div className="p-2 border-b border-border/80 bg-muted/30 relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-8 pl-7 pr-8 text-xs bg-background rounded-md border border-input focus:outline-none focus:border-primary text-foreground"
            />
            <div className="absolute right-3.5 flex items-center gap-1.5">
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />}
              {searchTerm && !isLoading && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5 no-scrollbar">
            {isLoading && filteredOptions.length === 0 ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Mencari data...</span>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              <>
                {filteredOptions.map((opt) => {
                  const isSelected = String(opt.value) === String(value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(opt.value, opt.raw)}
                      className={`w-full px-2.5 py-1.5 text-xs text-left rounded-lg flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-bold'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />}
                    </button>
                  );
                })}
                {isLoading && (
                  <div className="py-2 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5 border-t border-border/50">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span>Memperbarui hasil...</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;
