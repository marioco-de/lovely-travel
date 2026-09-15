import { useEffect, useRef } from "react";

const MOVE_PX = 12;
const SCROLL_PX = 6;
const TOUCH_CONFIRM_MS = 180;

type Point = { clientX: number; clientY: number; pointerType?: string };

export function useTapOpen(onOpen?: () => void, enabled = true) {
  const start = useRef<{ x: number; y: number; sy: number; pointerType: string } | null>(null);
  const scrolled = useRef(false);
  const timer = useRef<number>(0);

  useEffect(() => {
    const mark = () => {
      if (!start.current && !timer.current) return;
      scrolled.current = true;
      window.clearTimeout(timer.current);
      timer.current = 0;
    };
    window.addEventListener("scroll", mark, { passive: true, capture: true });
    window.addEventListener("touchmove", mark, { passive: true, capture: true });
    return () => {
      window.removeEventListener("scroll", mark, true);
      window.removeEventListener("touchmove", mark, true);
      window.clearTimeout(timer.current);
    };
  }, []);

  function clear() {
    start.current = null;
    window.clearTimeout(timer.current);
    timer.current = 0;
  }

  function onPointerDown(event: Point) {
    if (!enabled || !onOpen) return;
    window.clearTimeout(timer.current);
    timer.current = 0;
    scrolled.current = false;
    start.current = {
      x: event.clientX,
      y: event.clientY,
      sy: window.scrollY,
      pointerType: event.pointerType ?? "touch",
    };
  }

  function onPointerMove(event: Point) {
    const from = start.current;
    if (!from) return;
    if (Math.hypot(event.clientX - from.x, event.clientY - from.y) > MOVE_PX) {
      scrolled.current = true;
    }
  }

  function onPointerUp(event: Point) {
    const from = start.current;
    start.current = null;
    if (!enabled || !onOpen || !from) return;
    if (scrolled.current) return;
    if (Math.abs(window.scrollY - from.sy) > SCROLL_PX) return;
    if (Math.hypot(event.clientX - from.x, event.clientY - from.y) > MOVE_PX) return;
    if (from.pointerType === "mouse") {
      onOpen();
      return;
    }
    const originY = from.sy;
    timer.current = window.setTimeout(() => {
      timer.current = 0;
      if (scrolled.current) return;
      if (Math.abs(window.scrollY - originY) > SCROLL_PX) return;
      onOpen();
    }, TOUCH_CONFIRM_MS);
  }

  function onPointerCancel() {
    scrolled.current = true;
    clear();
  }

  function onClick(event: { preventDefault(): void; stopPropagation(): void }) {
    event.preventDefault();
    event.stopPropagation();
  }

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick };
}
