import type { ComponentProps } from "react";
export function StepLink({
  children,
  className = "",
  ...props
}: ComponentProps<"a">) {
  return (
    <a {...props} className={`step primary ${className}`}>
      {children}
      <span aria-hidden="true">↗</span>
    </a>
  );
}
