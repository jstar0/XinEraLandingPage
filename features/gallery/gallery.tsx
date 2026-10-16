"use client";

import { useState, type KeyboardEvent } from "react";
import { Island } from "./island";
import { galleryPlaces, scenes, type GalleryPlace } from "./content";

export function Gallery({ initialPlace }: { initialPlace: GalleryPlace }) {
  const [place, setPlace] = useState(initialPlace);
  const scene = scenes[place];
  function select(next: GalleryPlace) {
    setPlace(next);
    history.replaceState(null, "", `/gallery?place=${next}`);
    document.getElementById("gallery-view")?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }
  function key(event: KeyboardEvent<HTMLButtonElement>) {
    const index = galleryPlaces.indexOf(place);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? galleryPlaces.length - 1
          : event.key === "ArrowRight"
            ? (index + 1) % galleryPlaces.length
            : event.key === "ArrowLeft"
              ? (index + galleryPlaces.length - 1) % galleryPlaces.length
              : -1;
    if (next < 0) return;
    event.preventDefault();
    select(galleryPlaces[next]);
    document
      .getElementById(`gallery-${galleryPlaces[next]}`)
      ?.focus({ preventScroll: true });
  }
  return (
    <div className="gallery-page">
      <div className="gallery-heading">
        <div>
          <p className="gallery-kicker">世界巡游 / 旅途中的地方</p>
          <h1>先看看，将要走过的世界。</h1>
        </div>
        <a className="gallery-map-link" href="/map">
          卫星地图进度 <span aria-hidden="true">↗</span>
        </a>
      </div>
      <section className="gallery-exhibit" aria-label="精选场景">
        <div
          id="gallery-view"
          role="tabpanel"
          aria-labelledby={`gallery-${place}`}
        >
          <Island key={place} place={place} />
        </div>
        <div className="gallery-caption">
          <div>
            <h2>{scene.title}</h2>
            <p>{scene.description}</p>
          </div>
          <div className="gallery-caption-links">
            <a
              className="gallery-coordinate"
              href={`/map?x=${scene.coordinates[0]}&z=${scene.coordinates[1]}`}
            >
              <span>
                X {scene.coordinates[0]} / Z {scene.coordinates[1]}
              </span>
              <span>
                查看地图位置 <i aria-hidden="true">↗</i>
              </span>
            </a>
            {scene.journal && (
              <a className="gallery-journal" href={scene.journal}>
                阅读旅途手记 <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
        </div>
      </section>
      <div
        className="gallery-selection"
        role="tablist"
        aria-label="选择巡游场景"
      >
        {galleryPlaces.map((value, index) => (
          <button
            key={value}
            id={`gallery-${value}`}
            role="tab"
            aria-controls="gallery-view"
            aria-selected={place === value}
            tabIndex={place === value ? 0 : -1}
            onClick={() => select(value)}
            onKeyDown={key}
          >
            <img src={scenes[value].image} alt="" loading="lazy" />
            <span>
              <small>{scenes[value].kind}</small>
              <strong>{scenes[value].title}</strong>
            </span>
            <i aria-hidden="true">0{index + 1}</i>
          </button>
        ))}
      </div>
      <p className="gallery-edition">
        从城镇街巷到远方山海，先熟悉这片旅途。场景取自心纪元世界存档，可沿路线巡游，也可以停下来探索。卫星地图尚未开放。
      </p>
    </div>
  );
}
