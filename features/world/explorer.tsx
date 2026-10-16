"use client";
import { useState, type KeyboardEvent } from "react";
import { entries } from "@/features/journal/content";
import { StepLink } from "@/components/site/step-link";
export function WorldExplorer({ initialPlace }: { initialPlace: string }) {
  const [index, setIndex] = useState(initialPlace === "hall" ? 1 : 0);
  const entry = entries[index];
  function select(next: number) {
    setIndex(next);
    history.replaceState(null, "", `/world?place=${entries[next].slug}`);
  }
  function key(e: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const next = e.key === "Home" ? 0 : e.key === "End" ? 1 : 1 - index;
    select(next);
    document.getElementById(`place-${entries[next].slug}`)?.focus();
  }
  return (
    <div className="world-explorer">
      <div className="world-photos" aria-hidden="true">
        {entries.map((place, i) => (
          <img
            key={place.slug}
            src={place.image}
            alt=""
            className={i === index ? "active" : ""}
          />
        ))}
      </div>
      <div className="world-explorer-shade" />
      <div
        className="world-explorer-copy"
        role="tabpanel"
        id="place-content"
        aria-labelledby={`place-${entry.slug}`}
      >
        <p>心纪元 / 旅途中的地方</p>
        <h1>{entry.place}</h1>
        <p>{entry.summary}</p>
        <StepLink href={`/journal/${entry.slug}`}>阅读旅途手记</StepLink>
      </div>
      <div className="world-controls">
        <div className="place-tabs" role="tablist" aria-label="旅途地点">
          {entries.map((place, i) => (
            <button
              key={place.slug}
              id={`place-${place.slug}`}
              role="tab"
              aria-selected={index === i}
              aria-controls="place-content"
              tabIndex={index === i ? 0 : -1}
              onClick={() => select(i)}
              onKeyDown={key}
            >
              {place.place}
            </button>
          ))}
        </div>
        <a href="/map">
          卫星地图进度 <span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  );
}
