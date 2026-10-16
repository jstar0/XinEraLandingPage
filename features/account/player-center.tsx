"use client";
import { useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { skins } from "./skins";
import { SkinPreview } from "./skin-preview";
import { IdentityEntry } from "./identity-entry";
import {
  galleryPlaces,
  scenes,
  type GalleryPlace,
} from "@/features/gallery/content";

type Preferences = { skin: string; slim: boolean; favorites: GalleryPlace[] };
const storageKey = "xinera.player.v1";
const initial: Preferences = {
  skin: "protagonist",
  slim: false,
  favorites: [],
};
const initialSnapshot = JSON.stringify(initial);
let memorySnapshot = initialSnapshot;
let storageAvailable = true;
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("xinera-player", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("xinera-player", callback);
  };
}
function readSnapshot() {
  if (!storageAvailable) return memorySnapshot;
  try {
    return localStorage.getItem(storageKey) ?? memorySnapshot;
  } catch {
    return memorySnapshot;
  }
}
function writePreferences(change: Partial<Preferences>) {
  memorySnapshot = JSON.stringify({
    ...parsePreferences(readSnapshot()),
    ...change,
  });
  try {
    localStorage.setItem(storageKey, memorySnapshot);
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  window.dispatchEvent(new Event("xinera-player"));
  return storageAvailable;
}
function parsePreferences(raw: string): Preferences {
  try {
    const value = JSON.parse(raw);
    return {
      skin: skins.some((skin) => skin.id === value.skin)
        ? value.skin
        : "protagonist",
      slim: value.slim === true,
      favorites: Array.isArray(value.favorites)
        ? [
            ...new Set<GalleryPlace>(
              value.favorites.filter((id: GalleryPlace) =>
                galleryPlaces.includes(id),
              ),
            ),
          ]
        : [],
    };
  } catch {
    return initial;
  }
}
const tabs = [
  { id: "character", label: "角色" },
  { id: "identities", label: "游戏身份" },
  { id: "places", label: "收藏地点" },
] as const;
type Tab = (typeof tabs)[number]["id"];

export function PlayerCenter() {
  const raw = useSyncExternalStore(
    subscribe,
    readSnapshot,
    () => initialSnapshot,
  );
  const preferences = parsePreferences(raw);
  const [tab, setTab] = useState<Tab>("character");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const skin = skins.find((item) => item.id === preferences.skin) ?? skins[0];
  const filteredSkins = skins.filter((item) =>
    item.name.includes(query.trim()),
  );
  function save(change: Partial<Preferences>, success: string) {
    setMessage(
      writePreferences(change)
        ? success
        : "已更新当前页面。浏览器未允许保存，关闭后可能需要重新选择。",
    );
  }
  function changeTab(next: Tab) {
    setTab(next);
    setMessage("");
  }
  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
            tabs.length;
    changeTab(tabs[next].id);
    document.getElementById(`player-tab-${tabs[next].id}`)?.focus();
  }
  function favorite(place: GalleryPlace) {
    const current = parsePreferences(readSnapshot()).favorites;
    const exists = current.includes(place);
    save(
      {
        favorites: exists
          ? current.filter((id) => id !== place)
          : [...current, place],
      },
      `${scenes[place].title}${exists ? "已取消收藏" : "已收藏到此浏览器"}`,
    );
  }
  return (
    <main id="main" className="player-center">
      <div className="player-backdrop" aria-hidden="true" />
      <div className="player-tabs" role="tablist" aria-label="玩家中心">
        {tabs.map((item, index) => (
          <button
            key={item.id}
            id={`player-tab-${item.id}`}
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={`player-panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => changeTab(item.id)}
            onKeyDown={(event) => tabKey(event, index)}
          >
            {item.label}
            {item.id === "places" && preferences.favorites.length > 0 && (
              <span>{preferences.favorites.length}</span>
            )}
          </button>
        ))}
      </div>
      <section
        id="player-panel-character"
        role="tabpanel"
        aria-labelledby="player-tab-character"
        hidden={tab !== "character"}
      >
        {tab === "character" && (
          <>
            <div className="player-character-layout">
              <div className="player-intro">
                <span className="section-number">玩家中心</span>
                <h1>旅行者</h1>
                <p>
                  先选一个喜欢的模样，
                  <br />
                  再踏上心纪元的旅途。
                </p>
                <div className="player-identity-line">
                  <span aria-hidden="true">□</span> 尚未登录{" "}
                  <button onClick={() => changeTab("identities")}>
                    游戏身份 ↗
                  </button>
                </div>
                <div className="player-local-note">
                  外观与收藏保存在此浏览器
                </div>
              </div>
              <div className="player-stage">
                <SkinPreview
                  key={`${skin.id}-${preferences.slim}`}
                  src={skin.src}
                  name={skin.name}
                  slim={preferences.slim}
                />
              </div>
              <aside className="player-character-info">
                <span className="section-number">当前外观</span>
                <h2>{skin.name}</h2>
                <p className="player-appearance-note">来自心纪元角色皮肤集</p>
                <fieldset className="player-model-choice">
                  <legend>手臂模型</legend>
                  {[
                    { slim: false, label: "标准" },
                    { slim: true, label: "纤细" },
                  ].map((item) => (
                    <label key={item.label}>
                      <input
                        type="radio"
                        name="arm-model"
                        checked={preferences.slim === item.slim}
                        onChange={() =>
                          save({ slim: item.slim }, `已切换为${item.label}手臂`)
                        }
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </fieldset>
                <a
                  className="step primary"
                  href={skin.src}
                  download={`${skin.name}.png`}
                >
                  下载皮肤 PNG <span>↓</span>
                </a>
                <button
                  className="player-text-button"
                  onClick={() => changeTab("identities")}
                >
                  管理游戏身份 <span>↗</span>
                </button>
                <p className="player-sync-note">
                  此处仅预览外观，尚未同步到游戏。
                </p>
              </aside>
            </div>
            <section
              className="player-wardrobe"
              aria-labelledby="wardrobe-heading"
            >
              <div className="player-wardrobe-heading">
                <div>
                  <span className="section-number">
                    角色衣橱 · {skins.length} 款
                  </span>
                  <h2 id="wardrobe-heading">挑个模样，准备出发。</h2>
                </div>
                <label className="player-search">
                  查找皮肤
                  <input
                    type="search"
                    placeholder="试试「骑士」或「居民」"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
              </div>
              <div className="player-skin-grid">
                {filteredSkins.map((item) => (
                  <button
                    key={item.id}
                    aria-pressed={skin.id === item.id}
                    onClick={() =>
                      save(
                        { skin: item.id },
                        `已选择${item.name}，保存在此浏览器`,
                      )
                    }
                  >
                    <img
                      loading="lazy"
                      src={item.face}
                      alt=""
                      width="64"
                      height="64"
                    />
                    <span>{item.name}</span>
                    {skin.id === item.id && <i aria-hidden="true">✓</i>}
                  </button>
                ))}
              </div>
              {filteredSkins.length === 0 && (
                <p>没有找到这个名字，试试其他关键词。</p>
              )}
            </section>
          </>
        )}
      </section>
      <section
        id="player-panel-identities"
        role="tabpanel"
        aria-labelledby="player-tab-identities"
        hidden={tab !== "identities"}
      >
        {tab === "identities" && <IdentityEntry />}
      </section>
      <section
        id="player-panel-places"
        role="tabpanel"
        aria-labelledby="player-tab-places"
        hidden={tab !== "places"}
      >
        {tab === "places" && (
          <div className="player-places">
            <span className="section-number">收藏地点</span>
            <h1>下一站，去哪里？</h1>
            <p>
              {preferences.favorites.length
                ? `你在这个浏览器里收藏了 ${preferences.favorites.length} 处风景。`
                : "还没有收藏。先挑一处想去的地方，留给下次出发。"}
            </p>
            {preferences.favorites.length > 0 && (
              <>
                <h2>我的收藏</h2>
                <div className="player-place-grid">
                  {preferences.favorites.map((place) => (
                    <PlaceCard
                      key={place}
                      place={place}
                      saved
                      onFavorite={() => favorite(place)}
                    />
                  ))}
                </div>
              </>
            )}
            <h2>旅途中的八处地方</h2>
            <div className="player-place-grid">
              {galleryPlaces.map((place) => (
                <PlaceCard
                  key={place}
                  place={place}
                  saved={preferences.favorites.includes(place)}
                  onFavorite={() => favorite(place)}
                />
              ))}
            </div>
          </div>
        )}
      </section>
      <div className="player-live-status" role="status" aria-live="polite">
        {message}
      </div>
    </main>
  );
}
function PlaceCard({
  place,
  saved,
  onFavorite,
}: {
  place: GalleryPlace;
  saved: boolean;
  onFavorite: () => void;
}) {
  const scene = scenes[place];
  return (
    <article className="player-place-card">
      <a href={`/gallery?place=${place}`} aria-label={`巡游${scene.title}`}>
        <img src={scene.image} alt={scene.imageAlt} loading="lazy" />
        <h3>
          {scene.title} <span>↗</span>
        </h3>
      </a>
      <p>{scene.description}</p>
      <button aria-pressed={saved} onClick={onFavorite}>
        {saved ? "✓ 已收藏 · 移除" : "+ 收藏地点"}
      </button>
    </article>
  );
}
