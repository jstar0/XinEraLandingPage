"use client";
import type { ReactNode } from "react";
/** Only the image being followed participates in a cross-document transition. */
export function PhotoLink({
  href,
  name,
  className,
  children,
}: {
  href: string;
  name: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return;
        document
          .querySelectorAll<HTMLElement>("[data-photo-link] img")
          .forEach((image) => (image.style.viewTransitionName = "none"));
        const image = event.currentTarget.querySelector("img");
        if (image) image.style.viewTransitionName = name;
      }}
      data-photo-link
    >
      {children}
    </a>
  );
}
