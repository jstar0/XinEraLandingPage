"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="empty-page">
      <h1>这一页暂时没有打开。</h1>
      <p>可以重新试一次，或返回首页。</p>
      <button className="step primary" onClick={reset}>
        重试 <span>↻</span>
      </button>
      <a className="error-home" href="/">
        返回首页
      </a>
    </main>
  );
}
