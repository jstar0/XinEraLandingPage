"use client";
import { useEffect, useRef, useState } from "react";
import { Arrival, type ArrivalStage } from "@/features/rendering/arrival";
import { SceneHint } from "@/components/site/scene-hint";

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
  const [stage, setStage] = useState<ArrivalStage>("loading");
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    let cleanup: (() => void) | undefined;
    const report = (next: ArrivalStage) => {
      if (abort.signal.aborted) return;
      if (next === "ready" || next === "fallback") clearTimeout(watchdog);
      setStage(next);
    };
    const watchdog = window.setTimeout(() => {
      setStage("fallback");
      abort.abort();
      cleanup?.();
    }, 30_000);
    import("./skin-runtime")
      .then(async ({ mountSkin }) => {
        if (abort.signal.aborted || !canvas.current) return;
        cleanup = await mountSkin(canvas.current, src, slim, abort.signal, {
          preparing: () => report("preparing"),
          ready: () => report("ready"),
          failed: () => report("fallback"),
        });
      })
      .catch(() => {
        report("fallback");
      });
    return () => {
      clearTimeout(watchdog);
      abort.abort();
      cleanup?.();
    };
  }, [src, slim]);
  return (
    <div
      className="player-canvas-wrap"
      data-stage={stage}
      data-revealed={revealed}
      aria-busy={!revealed}
    >
      <canvas
        ref={canvas}
        tabIndex={revealed && stage === "ready" ? 0 : -1}
        aria-hidden={!revealed || stage !== "ready"}
        aria-label={`${name}的三维皮肤预览。拖动或方向键旋转，滚轮或加减键缩放，Home键复位。`}
      />
      <Arrival
        stage={stage}
        scope="scene"
        variant="blocks"
        label="正在准备外观"
        onRevealComplete={() => setRevealed(true)}
      />
      {stage === "fallback" && revealed ? (
        <p className="player-preview-error">
          三维预览暂时不可用，仍可在下方选择外观。
        </p>
      ) : stage === "ready" && revealed ? (
        <div className="player-drag-hint">
          <SceneHint subject="character" />
        </div>
      ) : null}
    </div>
  );
}
