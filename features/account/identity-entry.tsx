export function IdentityEntry() {
  return (
    <section className="player-identity-content">
      <span className="section-number">游戏身份</span>
      <h1>
        你的身份，
        <br />
        你的旅途。
      </h1>
      <p className="player-identity-intro">
        玩家中心的账号登录与关联还在准备中。现在可以先挑选角色外观，收藏想去的地方。
      </p>
      <div className="player-identity-options">
        <article>
          <span className="player-identity-symbol" aria-hidden="true">
            M
          </span>
          <h2>正版身份</h2>
          <p>
            使用拥有 Minecraft Java 版的 Microsoft 账号。正版角色外观可在 Minecraft
            账号中管理。
          </p>
          <a
            className="step primary"
            href="https://www.minecraft.net/msaprofile/mygames/editskin"
            target="_blank"
            rel="noreferrer"
          >
            前往 Minecraft 管理皮肤 <span>↗</span>
          </a>
          <small>本站尚未关联 Microsoft 账号</small>
        </article>
        <article>
          <span className="player-identity-symbol" aria-hidden="true">
            心
          </span>
          <h2>离线身份</h2>
          <p>
            这里选择的外观仅保存在当前浏览器。离线账号登录与游戏皮肤同步还未接入，可以先去巡游，挑选下次想去的地方。
          </p>
          <a className="step primary" href="/gallery">
            先去世界巡游 <span>↗</span>
          </a>
          <small>账号关联开放后，可在这里管理游戏身份</small>
        </article>
      </div>
    </section>
  );
}
