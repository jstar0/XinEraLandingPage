"use client";
import { useEffect, useRef, type ReactNode } from "react";
export function Reveal({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (!reduced.matches) {
            const animation = entry.target.animate(
              [
                { opacity: 0, transform: "translateY(28px)" },
                { opacity: 1, transform: "translateY(0)" },
              ],
              { duration: 700, easing: "cubic-bezier(.2,.7,.2,1)" },
            );
            animations.add(animation);
            animation.finished
              .catch(() => {})
              .finally(() => animations.delete(animation));
          }
          observer.unobserve(entry.target);
        }),
      { threshold: 0.15 },
    );
    el.querySelectorAll(".section-heading,.record-layout,.join-copy").forEach(
      (node) => observer.observe(node),
    );
    const stop = () => {
      if (reduced.matches) animations.forEach((a) => a.cancel());
    };
    reduced.addEventListener("change", stop);
    return () => {
      observer.disconnect();
      animations.forEach((a) => a.cancel());
      reduced.removeEventListener("change", stop);
    };
  }, []);
  return <div ref={root}>{children}</div>;
}
