import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Tag } from 'lucide-react';
import { CATEGORY_GROUPS, ALL_CATEGORIES, filterCategories } from '../../constants/categories';

interface CategorySelectProps {
  value: string;
  onChange: (category: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  customCategories?: string[];
  allowCustomInput?: boolean;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
  placeholder = 'Select a category...',
  customCategories = [],
  allowCustomInput = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredGroups = filterCategories(search, customCategories);
  const totalMatches = filteredGroups.reduce((acc, g) => acc + g.items.length, 0);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (category: string) => {
    onChange(category);
    setIsOpen(false);
    setSearch('');
  };

  const handleCustomAdd = () => {
    if (search.trim()) {
      onChange(search.trim());
      setIsOpen(false);
      setSearch('');
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm text-left transition-all ${
          disabled ? 'bg-slate-100 opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-slate-400'
        } ${isOpen ? 'ring-2 ring-indigo-500 border-indigo-500' : ''}`}
      >
        <div className="flex items-center gap-2 truncate">
          <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className={value ? 'text-slate-900 font-medium' : 'text-slate-400'}>
            {value || placeholder}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Hidden input for native form validation if required */}
      {required && (
        <input
          type="text"
          value={value}
          required={required}
          readOnly
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-80 flex flex-col">
          {/* Search Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search 40+ categories..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Grouped Category Options List */}
          <div className="overflow-y-auto flex-1 p-1 divide-y divide-slate-100">
            {filteredGroups.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-slate-500">No categories matching "{search}"</p>
                {allowCustomInput && search.trim() && (
                  <button
                    type="button"
                    onClick={handleCustomAdd}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <span>Use "{search.trim()}" as custom category</span>
                  </button>
                )}
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.group} className="py-1.5 first:pt-0 last:pb-0">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/70 rounded">
                    {group.group}
                  </div>
                  <div className="mt-0.5 space-y-0.5">
                    {group.items.map((item) => {
                      const isSelected = value?.toLowerCase() === item.toLowerCase();
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleSelect(item)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50 font-semibold text-indigo-700'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate">{item}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer count indicator */}
          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{totalMatches} categories available</span>
            {value && <span className="font-medium text-slate-600 truncate max-w-[120px]">Selected: {value}</span>}
          </div>
        </div>
      )}
    </div>
  );
};
