"use client";

import { useState, useRef, useCallback, useEffect, useId } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "motion/react";

/**
 * Magnetic Tabs — Rauno Freiberg craft.
 *
 * Pill indicator magnetically attracted to hovered tab.
 * Soft spring on hover, snappier overshoot on selection.
 * Audio tick on change.
 */

/* ── Audio singleton ── */

let _a: AudioContext | null = null;
let _b: AudioBuffer | null = null;

function getCtx(): AudioContext {
  if (!_a)
    _a = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
  if (_a.state === "suspended") _a.resume();
  return _a;
}

function getBuf(ac: AudioContext): AudioBuffer {
  if (_b && _b.sampleRate === ac.sampleRate) return _b;
  const len = Math.floor(ac.sampleRate * 0.003);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++)
    ch[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 4;
  _b = buf;
  return buf;
}

function tick(ref: React.MutableRefObject<number>) {
  const now = performance.now();
  if (now - ref.current < 25) return;
  ref.current = now;
  try {
    const ac = getCtx();
    const src = ac.createBufferSource();
    const g = ac.createGain();
    src.buffer = getBuf(ac);
    g.gain.value = 0.06;
    src.connect(g).connect(ac.destination);
    src.start();
  } catch {
    /* silent */
  }
}

/* ── Types ── */

export interface MagneticTabItem {
  value: string;
  label: string;
  content?: React.ReactNode;
}

interface MagneticTabsProps {
  items?: MagneticTabItem[];
  defaultValue?: string;
  onChange?: (value: string) => void;
  sound?: boolean;
  className?: string;
  id?: string;
}

/* ── Constants ── */

const HOVER_SPRING = { type: "spring" as const, stiffness: 300, damping: 25 };
const SELECT_SPRING = { type: "spring" as const, stiffness: 500, damping: 22 };
const CONTENT_SPRING = {
  type: "spring" as const,
  stiffness: 250,
  damping: 25,
};

/* ── Component ── */

export function MagneticTabs({
  items = [
    {
      value: "overview",
      label: "Overview",
      content: "Overview content here.",
    },
    {
      value: "activity",
      label: "Activity",
      content: "Activity content here.",
    },
    {
      value: "settings",
      label: "Settings",
      content: "Settings content here.",
    },
    { value: "faq", label: "FAQ", content: "FAQ content here." },
  ],
  defaultValue,
  onChange,
  sound = true,
  className,
  id,
}: MagneticTabsProps) {
  const generatedId = useId();
  const tabsId = id ?? generatedId;
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState(defaultValue || items[0]?.value || "");
  const [hovered, setHovered] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const lastSound = useRef(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const barRef = useRef<HTMLDivElement | null>(null);
  const measured = useRef(false);
  const selectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(selectTimer.current), []);

  const pillX = useMotionValue(0);
  const pillW = useMotionValue(0);
  const springConfig = selectMode ? SELECT_SPRING : HOVER_SPRING;
  const springX = useSpring(pillX, springConfig);
  const springW = useSpring(pillW, springConfig);

  const movePill = useCallback(
    (value: string) => {
      const bar = barRef.current;
      if (!bar) return;
      const idx = items.findIndex((t) => t.value === value);
      const btn = tabRefs.current[idx];
      if (!btn) return;
      // Use offsetLeft/offsetWidth — immune to ancestor CSS transforms (e.g. scale)
      const x = btn.offsetLeft;
      const w = btn.offsetWidth;
      if (!measured.current) {
        pillX.jump(x);
        pillW.jump(w);
        measured.current = true;
      } else {
        pillX.set(x);
        pillW.set(w);
      }
    },
    [items, pillX, pillW],
  );

  useEffect(() => {
    movePill(hovered || active);
    const ro = new ResizeObserver(() => movePill(hovered || active));
    if (barRef.current) ro.observe(barRef.current);
    return () => ro.disconnect();
  }, [active, hovered, movePill]);

  const go = useCallback(
    (value: string) => {
      if (value === active) return;
      setSelectMode(true);
      if (sound) tick(lastSound);
      setActive(value);
      onChange?.(value);
      clearTimeout(selectTimer.current);
      selectTimer.current = setTimeout(() => setSelectMode(false), 300);
    },
    [active, onChange, sound],
  );

  const activeItem = items.find((t) => t.value === active);

  return (
    <div className={className}>

      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Component details"
        ref={barRef}
        className="relative inline-flex items-center rounded-xl border border-border bg-secondary p-1 shadow-sm backdrop-blur-md"
        onMouseLeave={() => setHovered(null)}
      >
        {/* Pill indicator */}
        <motion.div
          className="pointer-events-none absolute inset-y-1 left-0 z-0 rounded-lg bg-foreground/10"
          style={{ x: reducedMotion ? pillX : springX, width: reducedMotion ? pillW : springW }}
        />

        {/* Tab buttons */}
        {items.map((item, i) => (
          <button
            type="button"
            role="tab"
            id={`${tabsId}-tab-${item.value}`}
            aria-selected={active === item.value}
            aria-controls={`${tabsId}-panel-${item.value}`}
            tabIndex={active === item.value ? 0 : -1}
            key={item.value}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            onClick={() => go(item.value)}
            onKeyDown={(e) => {
              const next = e.key === 'ArrowRight' ? (i + 1) % items.length : e.key === 'ArrowLeft' ? (i - 1 + items.length) % items.length : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : -1;
              if (next >= 0) { e.preventDefault(); go(items[next].value); tabRefs.current[next]?.focus(); }
            }}
            onMouseEnter={() => {
              setSelectMode(false);
              clearTimeout(selectTimer.current);
              setHovered(item.value);
            }}
            className={`relative z-10 cursor-pointer whitespace-nowrap rounded-lg px-4 py-2 text-sm leading-none font-medium transition-colors ${active === item.value ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Content panel */}
      {activeItem?.content != null && (
        <div className="relative mt-4 min-h-15">
          <AnimatePresence mode="wait">
            <motion.div
              role="tabpanel"
              id={`${tabsId}-panel-${active}`}
              aria-labelledby={`${tabsId}-tab-${active}`}
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={CONTENT_SPRING}
              className="rounded-xl border border-border bg-card p-5 text-sm leading-relaxed text-foreground"
            >
              {activeItem.content}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default MagneticTabs;
