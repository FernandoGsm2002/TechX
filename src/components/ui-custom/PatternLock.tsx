"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Dot ids 1-9, left-to-right, top-to-bottom
const DOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function getDotCenter(id: number, size: number): [number, number] {
  const col = (id - 1) % 3;
  const row = Math.floor((id - 1) / 3);
  const cell = size / 3;
  return [col * cell + cell / 2, row * cell + cell / 2];
}

interface PatternLockProps {
  /** Comma-separated dot ids e.g. "1,5,9" */
  value: string;
  /** If provided → interactive input mode. Omit for read-only display. */
  onChange?: (val: string) => void;
  /** Pixel size of the square canvas. Default 192 interactive / 88 display. */
  size?: number;
}

export function PatternLock({ value, onChange, size }: PatternLockProps) {
  const readOnly  = !onChange;
  const sz        = size ?? (readOnly ? 88 : 192);
  const cell      = sz / 3;
  const outerR    = cell * 0.4;
  const dotR      = cell * 0.2;

  const savedSeq: number[] = value
    ? value.split(",").map(Number).filter((n) => n >= 1 && n <= 9)
    : [];

  const [drawing,  setDrawing]  = useState(false);
  const [liveSeq,  setLiveSeq]  = useState<number[]>([]);
  const [mousePos, setMousePos] = useState<[number, number] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const displaySeq = drawing ? liveSeq : savedSeq;

  // ── Mouse ────────────────────────────────────────────────────────────────
  const startDot = (id: number) => {
    if (readOnly) return;
    setDrawing(true);
    setLiveSeq([id]);
    setMousePos(null);
  };

  const enterDot = (id: number) => {
    if (!drawing || readOnly) return;
    setLiveSeq((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const endDrawing = useCallback(() => {
    if (!drawing) return;
    setDrawing(false);
    setMousePos(null);
    if (liveSeq.length > 0 && onChange) onChange(liveSeq.join(","));
    setLiveSeq([]);
  }, [drawing, liveSeq, onChange]);

  useEffect(() => {
    if (drawing) {
      window.addEventListener("mouseup",  endDrawing);
      window.addEventListener("touchend", endDrawing);
      return () => {
        window.removeEventListener("mouseup",  endDrawing);
        window.removeEventListener("touchend", endDrawing);
      };
    }
  }, [drawing, endDrawing]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    setMousePos([e.clientX - r.left, e.clientY - r.top]);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!drawing || readOnly) return;
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el) {
      const dotId = Number((el as HTMLElement).dataset.dotid);
      if (dotId >= 1 && dotId <= 9) enterDot(dotId);
    }
    if (containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      setMousePos([touch.clientX - r.left, touch.clientY - r.top]);
    }
  };

  const lastInSeq = displaySeq[displaySeq.length - 1];

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative select-none",
        !readOnly && "rounded-2xl border border-border bg-muted/50"
      )}
      style={{
        width: sz,
        height: sz,
        touchAction: readOnly ? "auto" : "none",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMousePos(null)}
      onTouchMove={handleTouchMove}
    >
      {/* ── SVG lines ── */}
      <svg
        width={sz}
        height={sz}
        className="absolute inset-0 pointer-events-none"
      >
        {displaySeq.map((id, i) => {
          if (i === 0) return null;
          const [x1, y1] = getDotCenter(displaySeq[i - 1], sz);
          const [x2, y2] = getDotCenter(id, sz);
          return (
            <line
              key={`seg-${i}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="hsl(var(--primary))"
              strokeWidth={readOnly ? 1.5 : 2.5}
              strokeLinecap="round"
              opacity={0.7}
            />
          );
        })}

        {/* Trailing dashed line to cursor */}
        {drawing && mousePos && lastInSeq && (() => {
          const [x1, y1] = getDotCenter(lastInSeq, sz);
          return (
            <line
              x1={x1} y1={y1}
              x2={mousePos[0]} y2={mousePos[1]}
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              opacity={0.4}
            />
          );
        })()}
      </svg>

      {/* ── Dots ── */}
      {DOTS.map((id) => {
        const [cx, cy] = getDotCenter(id, sz);
        const inSeq  = displaySeq.includes(id);
        const order  = displaySeq.indexOf(id);
        const isFirst = order === 0;
        const isLast  = inSeq && order === displaySeq.length - 1;

        return (
          <div
            key={id}
            data-dotid={id}
            onMouseDown={() => startDot(id)}
            onMouseEnter={() => enterDot(id)}
            onTouchStart={(e) => { e.preventDefault(); startDot(id); }}
            className={cn(
              "absolute flex items-center justify-center rounded-full transition-colors duration-100",
              !readOnly && "cursor-pointer",
              inSeq ? "bg-primary/15" : "bg-transparent"
            )}
            style={{
              left:   cx - outerR,
              top:    cy - outerR,
              width:  outerR * 2,
              height: outerR * 2,
            }}
          >
            {/* Inner dot */}
            <div
              data-dotid={id}
              className={cn(
                "rounded-full flex items-center justify-center transition-all duration-100",
                inSeq
                  ? "bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.5)]"
                  : "bg-slate-500 dark:bg-slate-400 border-2 border-slate-400/40 dark:border-slate-500/40"
              )}
              style={{
                width:  dotR * 2,
                height: dotR * 2,
                pointerEvents: "none",
              }}
            >
              {/* First dot marker */}
              {isFirst && (
                <div className="w-[38%] h-[38%] rounded-full bg-white/90" />
              )}
              {/* Order number — interactive non-first */}
              {!readOnly && inSeq && !isFirst && (
                <span
                  className="text-primary-foreground font-black leading-none select-none"
                  style={{ fontSize: dotR * 0.85 }}
                >
                  {order + 1}
                </span>
              )}
            </div>

            {/* Pulse ring on last active dot while drawing */}
            {!readOnly && drawing && isLast && (
              <div
                className="absolute inset-0 rounded-full border-2 border-primary/50"
                style={{ animation: "patternPulse 0.8s ease-out infinite" }}
              />
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes patternPulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          100% { transform: scale(1.7); opacity: 0;   }
        }
      `}</style>
    </div>
  );
}
