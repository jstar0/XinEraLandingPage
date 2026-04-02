import React from "react";

type MobileDockItem = {
  href: string;
  key: "explore" | "access" | "return" | "status";
  label: string;
  symbol: string;
};

type MobileEntryDockProps = {
  activeHref: string | null;
  items: MobileDockItem[];
  labelClassName: string;
};

function isInternalHref(href: string) {
  return href.startsWith("#");
}

function joinClassNames(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

export default function MobileEntryDock({
  activeHref,
  items,
  labelClassName,
}: MobileEntryDockProps) {
  if (!items.length) {
    return null;
  }

  return (
    <nav
      aria-label="Mobile entry dock"
      data-mobile-dock="entry-station"
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-white/8 bg-[rgba(9,12,15,0.94)] px-3 pb-[max(env(safe-area-inset-bottom),0.8rem)] pt-3 backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid max-w-xl grid-cols-4 gap-2">
        {items.map((item) => {
          const active = isInternalHref(item.href) && item.href === activeHref;
          const external = !isInternalHref(item.href);

          return (
            <a
              key={item.key}
              data-mobile-dock-item={item.key}
              href={item.href}
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer noopener" : undefined}
              aria-current={active ? "page" : undefined}
              className={joinClassNames(
                "group flex min-h-[4.5rem] flex-col items-center justify-center gap-1 bg-[#12171b] px-1.5 py-2 text-center transition-[transform,color,background-color] duration-300 ease-out",
                active
                  ? "bg-[#15242a] text-[#53d6d8]"
                  : "text-white/36 hover:-translate-y-px hover:bg-[#161d21] hover:text-white/72",
              )}
            >
              <span
                className={joinClassNames(
                  "text-sm transition-transform duration-300 ease-out group-hover:-translate-y-px",
                  active && "text-[#53d6d8]",
                )}
              >
                {item.symbol}
              </span>
              <span className={joinClassNames(labelClassName, "text-[9px] leading-none")}>
                {item.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
