import React from "react";

type SignalBandProps = {
  bandId: string;
  className?: string;
  itemClassName: string;
  trackClassName?: string;
  items: string[];
};

function joinClassNames(...tokens: Array<string | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

export default function SignalBand({
  bandId,
  className,
  itemClassName,
  trackClassName,
  items,
}: SignalBandProps) {
  if (!items.length) {
    return null;
  }

  const loopedItems = [...items, ...items];

  return (
    <div
      aria-hidden="true"
      data-signal-band={bandId}
      className={joinClassNames("signal-band-frame border-y border-white/6 bg-[#0e1317]", className)}
    >
      <div className="mx-auto max-w-7xl overflow-hidden">
        <div className={joinClassNames("signal-band-track", trackClassName)}>
          {loopedItems.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className={joinClassNames(
                "signal-band-item inline-flex items-center gap-3 whitespace-nowrap",
                itemClassName,
              )}
            >
              <span className="signal-band-dot" />
              <span>{item}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
