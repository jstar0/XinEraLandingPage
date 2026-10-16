import { PhotoLink } from "@/components/site/photo-link";
import { entries } from "./content";
export function Records({ standalone = false }: { standalone?: boolean }) {
  return (
    <section
      id="records"
      className={`records ${standalone ? "records-page" : ""}`}
      aria-labelledby="records-title"
    >
      <div className="section-heading">
        <div>
          <span className="section-number">
            {standalone ? "世界 / 旅途手记" : "02 — 旅途手记"}
          </span>
          {standalone ? (
            <h1 id="records-title">旅途手记。</h1>
          ) : (
            <h2 id="records-title">旅途手记。</h2>
          )}
        </div>
        <p>关于离乡、相遇，与一名骑士的誓言。</p>
      </div>
      <div className="record-layout">
        {entries.map((entry, i) => (
          <PhotoLink
            name={`${entry.slug}-photo`}
            key={entry.slug}
            href={`/journal/${entry.slug}`}
            className={i === 0 ? "featured" : "secondary-record"}
          >
            <div className="image-mask">
              <img
                src={entry.image}
                alt={entry.summary}
                loading="lazy"
                style={{
                  viewTransitionName: standalone
                    ? `${entry.slug}-photo`
                    : "none",
                }}
              />
            </div>
            <div className="feature-title">
              <h3>{entry.title}</h3>
              <span
                className={i === 0 ? "round-arrow" : undefined}
                aria-hidden="true"
              >
                ↗
              </span>
            </div>
            <p>故事片段 · {entry.place}</p>
          </PhotoLink>
        ))}
      </div>
    </section>
  );
}
