"use client";

import { useEffect } from "react";

/**
 * The page's one bit of motion: what is below the fold when the page loads fades in as it is
 * scrolled to. Everything is on the page and visible until this runs, and nothing is hidden for a
 * visitor who asks for reduced motion, so the page is complete at rest.
 */
export function Reveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;
    const below = [...document.querySelectorAll<HTMLElement>("[data-reveal]")].filter(
      (element) => element.getBoundingClientRect().top > window.innerHeight,
    );
    if (below.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = "done";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    for (const element of below) {
      element.dataset.reveal = "pending";
      observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);
  return null;
}
