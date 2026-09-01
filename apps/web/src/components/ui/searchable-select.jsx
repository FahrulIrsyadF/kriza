import React, { useState, useRef, useEffect } from 'react';
import { ChevronsUpDown, Check, Search, X } from 'lucide-react';

/**
 * SearchableSelect (Combobox) component with instant live filtering.
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
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize options to have standard { key, label, raw }
  const normalizedOptions = options.map((opt) => {
    const val = opt.id !== undefined ? opt.id : opt.value;
    const label = opt.name !== undefined ? opt.name : opt.label || String(val);
    return { value: val, label, raw: opt };
  });

  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value));

  // Filter options based on search query
  const filteredOptions = normalizedOptions.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

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

  // Focus search input when dropdown opens
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
            selectedOption ? 'text-foreground font-semibold' : 'text-muted-foreground'
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder}
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
              className="w-full h-8 pl-7 pr-7 text-xs bg-background rounded-md border border-input focus:outline-none focus:border-primary text-foreground"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5 no-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt) => {
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
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;
