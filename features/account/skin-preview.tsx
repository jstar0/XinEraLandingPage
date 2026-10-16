"use client";
import { useEffect, useRef, useState } from "react";

export function SkinPreview({
  src,
  name,
  slim,
}: {
  src: string;
  name: string;
  slim: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    let cleanup: (() => void) | undefined;
    import("./skin-runtime")
      .then(async ({ mountSkin }) => {
        if (abort.signal.aborted || !canvas.current) return;
        cleanup = await mountSkin(canvas.current, src, slim, abort.signal, () =>
          setFailed(true),
        );
      })
      .catch(() => {
        if (!abort.signal.aborted) setFailed(true);
      });
    return () => {
      abort.abort();
      cleanup?.();
    };
  }, [src, slim]);
  return (
    <div className="player-canvas-wrap">
      <canvas
        ref={canvas}
        tabIndex={0}
        aria-label={`${name}的三维皮肤预览。拖动或方向键旋转，滚轮或加减键缩放，Home键复位。`}
      />
      {failed ? (
        <p className="player-preview-error">
          三维预览暂时不可用，仍可选择和下载皮肤。
        </p>
      ) : (
        <span className="player-drag-hint">拖动旋转 · 滚轮缩放</span>
      )}
    </div>
  );
}
