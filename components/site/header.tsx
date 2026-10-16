"use client";
import { useRef } from "react";
import { asset } from "@/lib/site";
import { ThemeToggle } from "./theme-toggle";

export function Header({ hero = false }: { hero?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);
  async function close() {
    const el = dialog.current;
    if (!el?.open || closing.current) return;
    closing.current = true;
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const animation = el.animate(
        [
          { opacity: 1, transform: "translateY(0)" },
          { opacity: 0, transform: "translateY(3vh)" },
        ],
        { duration: 260, easing: "cubic-bezier(.3,.7,.3,1)" },
      );
      await animation.finished.catch(() => {});
    }
    el.close();
    closing.current = false;
    opener.current?.focus();
  }
  return (
    <>
      <header
        className={`site-nav ${hero ? "" : "inner-nav"}`}
        id={hero ? "hero-nav" : undefined}
      >
        <a className="brand" href="/" aria-label="心纪元首页">
          <img
            src={asset("logo-pixel-96-mono.png")}
            width="46"
            height="46"
            alt=""
          />
        </a>
        <nav aria-label="主导航">
          <a href="/gallery" className="nav-destination">
            巡游
          </a>
          <a href="/map" className="nav-destination">
            地图
          </a>
          <a href="/journal">手记</a>
          <button
            ref={opener}
            onClick={() => dialog.current?.showModal()}
            aria-haspopup="dialog"
          >
            探索 <span className="nav-cross" aria-hidden="true" />
          </button>
          <a href="/account" className="nav-account">
            玩家中心 <span aria-hidden="true">↗</span>
          </a>
          <ThemeToggle />
        </nav>
      </header>
      <dialog
        ref={dialog}
        className="explore-menu"
        aria-labelledby="menu-heading"
        onCancel={(e) => {
          e.preventDefault();
          void close();
        }}
      >
        <div className="menu-top">
          <img
            src={asset("logo-pixel-96-mono.png")}
            alt="心纪元"
            width="46"
            height="46"
          />
          <button onClick={() => void close()}>
            关闭 <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="menu-body">
          <div className="menu-picture">
            <img src={asset("courtyard.jpg")} alt="西奥格勒的教堂庭院" />
          </div>
          <div className="menu-links">
            <h2 id="menu-heading">探索心纪元</h2>
            {[
              ["巡游", "/gallery"],
              ["卫星地图", "/map"],
              ["旅途手记", "/journal"],
              ["玩家中心", "/account"],
            ].map(([label, href], i) => (
              <a key={href} href={href}>
                <span>{label}</span>
                <i aria-hidden="true">0{i + 1}</i>
              </a>
            ))}
          </div>
        </div>
      </dialog>
    </>
  );
}
