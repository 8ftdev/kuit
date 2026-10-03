"use client";

// Adapted from Ruixen Button Dropdown: semantic Tailwind theme and select behavior.
import { useEffect, useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DropdownItem { label: string; value: string }
export interface ButtonDropdownProps {
  label: string;
  value: string;
  items: DropdownItem[];
  onSelect: (value: string) => void;
  className?: string;
  monospace?: boolean;
}

export default function ButtonDropdown({ label, value, items, onSelect, className, monospace = false }: ButtonDropdownProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  const search = useRef({ text: '', time: 0 });
  const reduceMotion = useReducedMotion();
  const selected = items.find(item => item.value === value);

  function close(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }
  function show(index = Math.max(0, items.findIndex(item => item.value === value))) {
    setActive(index);
    setOpen(true);
  }
  useEffect(() => {
    if (open) options.current[active]?.focus();
  }, [open, active]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  return <div ref={root} className={cn('relative min-w-0', className)} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) close();
  }} onKeyDown={event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
    else if (event.key === 'Tab') close();
    else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (!open) { show(event.key === 'ArrowUp' ? items.length - 1 : undefined); return; }
      setActive(index => event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length);
    } else if (event.key.length === 1 && event.key !== ' ') {
      event.preventDefault();
      const now = Date.now();
      search.current = { text: (now - search.current.time < 500 ? search.current.text : '') + event.key.toLowerCase(), time: now };
      const match = items.findIndex(item => item.label.toLowerCase().startsWith(search.current.text));
      if (match >= 0) show(match);
    }
  }}>
    <motion.button ref={trigger} type="button" id={`${id}-trigger`} aria-label={`${label}: ${selected?.label ?? value}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${id}-list` : undefined} disabled={!items.length} onClick={() => open ? close() : show()} whileTap={reduceMotion ? undefined : { scale: 0.98 }} className={cn('inline-flex h-9 w-full items-center justify-between gap-3 rounded-lg border border-input bg-secondary px-3 text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50', monospace && 'font-mono text-xs')}>
      <span className="truncate" title={selected?.label}>{selected?.label ?? value}</span>
      <ChevronDown aria-hidden="true" className={cn('size-3.5 shrink-0 text-muted-foreground motion-safe:transition-transform', open && 'rotate-180')} />
    </motion.button>
    {open && <motion.div id={`${id}-list`} role="listbox" aria-label={label} initial={reduceMotion ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="absolute left-0 top-full z-20 mt-2 max-h-60 w-max min-w-full max-w-60 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg">
      {items.map((item, index) => <button key={item.value} ref={element => { options.current[index] = element; }} type="button" role="option" aria-selected={item.value === value} tabIndex={index === active ? 0 : -1} onClick={() => { onSelect(item.value); close(true); }} className={cn('flex min-h-9 w-full items-center justify-between gap-4 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-accent focus-visible:bg-accent focus-visible:outline-none', monospace && 'font-mono text-xs')}>
        <span className="truncate" title={item.label}>{item.label}</span>
        <Check aria-hidden="true" className={cn('size-3.5 shrink-0', item.value !== value && 'invisible')} />
      </button>)}
    </motion.div>}
  </div>;
}
