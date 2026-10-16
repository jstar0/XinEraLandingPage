import { site } from "@/lib/site";
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-identity">
        <span>心纪元 · XIN ERA</span>
        <a href={site.filing.href} rel="noreferrer" target="_blank">
          {site.filing.label}
        </a>
      </div>
      <nav aria-label="页脚导航">
        <a href="/gallery">巡游</a>
        <a href="/map">地图</a>
        <a href="/journal">旅途手记</a>
        <a href="/account">玩家中心</a>
        <a href={site.services.status}>服务状态 ↗</a>
      </nav>
    </footer>
  );
}
