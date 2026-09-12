import { useEffect, useRef, useState } from "react";

export function useInView<T extends HTMLElement = HTMLDivElement>(
  options?: IntersectionObserverInit,
) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const threshold = options?.threshold ?? 0.14;
  const rootMargin = options?.rootMargin ?? "0px 0px -10% 0px";

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, threshold, rootMargin]);

  return { ref, inView };
}
