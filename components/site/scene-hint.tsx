import "./scene-hint.css";

export function SceneHint({
  subject,
  touring = false,
}: {
  subject: "character" | "world";
  touring?: boolean;
}) {
  return (
    <span className="scene-hint">
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M3 7h14M6 4 3 7l3 3m8-6 3 3-3 3M5 13v3h10v-3"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinejoin="miter"
        />
      </svg>
      <span className="scene-hint-pointer">
        {touring
          ? "自动巡游中 · 拖动暂停"
          : `${subject === "character" ? "拖动旋转" : "拖动环顾"} · 滚轮缩放`}
      </span>
      <span className="scene-hint-touch">
        {touring
          ? "自动巡游中 · 双指操作可暂停"
          : `${subject === "character" ? "单指旋转" : "双指环顾"} · 捏合缩放`}
      </span>
      <span className="scene-hint-keyboard">方向键旋转 · + / − 缩放</span>
    </span>
  );
}
