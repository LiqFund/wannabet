'use client';

import clsx from 'clsx';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type UnifiedSelectOption = {
  value: string;
  label: string;
};

type UnifiedSelectProps = {
  value: string;
  onValueChange: (v: string) => void;
  options: UnifiedSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  widthClassName?: string;
  name?: string;
};

export function UnifiedSelect({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  className,
  widthClassName = 'w-full md:w-[260px]',
  name
}: UnifiedSelectProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selectedLabel = useMemo(() => options.find((option) => option.value === value)?.label, [options, value]);

  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const desiredWidth = Math.max(rect.width, 180);
      const maxLeft = window.innerWidth - desiredWidth - 8;
      setPosition({
        top: Math.min(rect.bottom + 8, window.innerHeight - 8),
        left: Math.max(8, Math.min(rect.left, maxLeft)),
        width: desiredWidth
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !listRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = options.findIndex((option) => option.value === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, options, value]);

  const choose = (nextValue: string) => {
    onValueChange(nextValue);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="relative">
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={clsx('wb-select-trigger relative', widthClassName, className)}
      >
        <span className={clsx(!selectedLabel && 'text-white/55')}>{selectedLabel ?? placeholder ?? 'Select an option'}</span>
        <span className="wb-select-chevron" aria-hidden>
          <svg viewBox="0 0 20 20" fill="none" className={clsx('h-4 w-4 transition-transform', open && 'rotate-180')} xmlns="http://www.w3.org/2000/svg">
            <path d="M5.5 7.75L10 12.25L14.5 7.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {mounted && open
        ? createPortal(
            <div
              ref={listRef}
              id={listId}
              role="listbox"
              className="wb-select-content fixed"
              style={{ top: position.top, left: position.left, width: position.width }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setOpen(false);
                  triggerRef.current?.focus();
                  return;
                }

                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setActiveIndex((prev) => Math.min(prev + 1, options.length - 1));
                }

                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActiveIndex((prev) => Math.max(prev - 1, 0));
                }

                if (event.key === 'Enter' && activeIndex >= 0) {
                  event.preventDefault();
                  choose(options[activeIndex].value);
                }
              }}
              tabIndex={-1}
            >
              <div className="max-h-[320px] overflow-auto p-1.5">
                {options.map((option, index) => {
                  const isSelected = value === option.value;
                  const isHighlighted = index === activeIndex;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      data-state={isSelected ? 'checked' : 'unchecked'}
                      data-highlighted={isHighlighted ? '' : undefined}
                      className="wb-select-item w-full text-left"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => choose(option.value)}
                    >
                      <span className="wb-select-item-indicator" aria-hidden>
                        {isSelected ? (
                          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4.5 10.5L8 14L15.5 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : null}
                      </span>
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
