/** Hold the document still until the arrival transition has actually ended. */
export function lockArrivalScroll() {
  const html = document.documentElement;
  const body = document.body;
  const x = window.scrollX;
  const y = window.scrollY;
  const saved: Array<[CSSStyleDeclaration, string, string, string]> = [];
  const set = (style: CSSStyleDeclaration, property: string, value: string) => {
    saved.push([
      style,
      property,
      style.getPropertyValue(property),
      style.getPropertyPriority(property),
    ]);
    style.setProperty(property, value);
  };
  // A fixed body also holds touch scrolling and focus/anchor-driven scrolling.
  // Preserve its current offset so history restoration does not jump to the top.
  const gutter = innerWidth - html.clientWidth;
  const padding = parseFloat(getComputedStyle(body).paddingRight) || 0;
  set(html.style, "overflow", "hidden");
  set(html.style, "overscroll-behavior", "none");
  set(body.style, "position", "fixed");
  set(body.style, "top", `${-y}px`);
  set(body.style, "left", `${-x}px`);
  set(body.style, "width", "100%");
  set(body.style, "overflow", "hidden");
  set(body.style, "touch-action", "none");
  if (gutter) set(body.style, "padding-right", `${padding + gutter}px`);
  html.dataset.arrivalLocked = "true";

  const controller = new AbortController();
  const options = { capture: true, passive: false, signal: controller.signal };
  const preventScroll = (event: Event) => event.preventDefault();
  window.addEventListener("wheel", preventScroll, options);
  window.addEventListener("touchmove", preventScroll, options);
  window.addEventListener(
    "keydown",
    (event) => {
      if (
        [
          " ",
          "ArrowUp",
          "ArrowDown",
          "PageUp",
          "PageDown",
          "Home",
          "End",
        ].includes(event.key) &&
        !(
          event.target instanceof Element &&
          event.target.closest(
            "input, textarea, select, button, [contenteditable=true]",
          )
        )
      )
        event.preventDefault();
    },
    options,
  );
  // The departure link also starts a programmatic camera move. Do not queue
  // that move behind the clouds; ordinary navigation remains available.
  window.addEventListener(
    "click",
    (event) => {
      if (
        event.target instanceof Element &&
        event.target.closest("[data-enter-world]")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    options,
  );
  let released = false;
  return () => {
    if (released) return;
    released = true;
    controller.abort();
    for (const [style, property, value, priority] of saved.reverse()) {
      if (value) style.setProperty(property, value, priority);
      else style.removeProperty(property);
    }
    delete html.dataset.arrivalLocked;
    window.scrollTo({ left: x, top: y, behavior: "instant" });
  };
}
