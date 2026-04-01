import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import LandingPageShell from "../components/home/landing-page-shell";
import {
  resolveLocaleFromAcceptLanguage,
  resolveLocaleFromNavigator,
  type SupportedLocale,
} from "../components/home/i18n";

function render(locale: SupportedLocale) {
  return renderToStaticMarkup(
    React.createElement(LandingPageShell, {
      locale,
      onLocaleChange: () => {},
    }),
  );
}

test("accept-language and navigator locale detection support zh-CN, zh-TW, en, and ja", () => {
  assert.equal(resolveLocaleFromAcceptLanguage("zh-TW,zh;q=0.9,en;q=0.8"), "zh-TW");
  assert.equal(resolveLocaleFromAcceptLanguage("ja-JP,ja;q=0.9,en-US;q=0.8"), "ja");
  assert.equal(resolveLocaleFromAcceptLanguage("en-US,en;q=0.9"), "en");
  assert.equal(resolveLocaleFromAcceptLanguage("fr-FR,fr;q=0.8"), "zh-CN");

  assert.equal(resolveLocaleFromNavigator(["zh-HK", "en-US"]), "zh-TW");
  assert.equal(resolveLocaleFromNavigator(["en-GB"]), "en");
  assert.equal(resolveLocaleFromNavigator(["ja-JP"]), "ja");
  assert.equal(resolveLocaleFromNavigator([]), "zh-CN");
});

test("simplified Chinese uses bitmap typography and localized copy", () => {
  const html = render("zh-CN");

  assert.match(html, /data-locale="zh-CN"/);
  assert.match(html, /data-script="bitmap-cjk"/);
  assert.match(html, /心纪元/);
  assert.match(html, /心纪元分享站/);
  assert.match(html, /进入玩家入口/);
  assert.match(html, /玩家入口矩阵/);
  assert.match(html, /万象伊始，从心纪元。/);
  assert.match(html, /href="https:\/\/beian\.miit\.gov\.cn\/?"/);
  assert.doesNotMatch(
    html,
    /本站为个人维护的非盈利分享站，用于展示与分享服务器项目、设定与玩家入口。/,
  );
  assert.doesNotMatch(html, /这里先是分享站，再是玩家真正进入这个世界的入口。/);
  assert.doesNotMatch(html, /主站会保持分享站的外观与口吻/);
  assert.doesNotMatch(html, /PERSONAL_SITE_ONLINE/);
  assert.doesNotMatch(html, /HIST_01/);
  assert.doesNotMatch(html, /SYS\.USR_AUTH/);
});

test("traditional Chinese, English, and Japanese each render their own translated landing copy", () => {
  const zhTw = render("zh-TW");
  const en = render("en");
  const ja = render("ja");

  assert.match(zhTw, /心紀元分享站/);
  assert.match(zhTw, /進入玩家入口/);
  assert.match(zhTw, /萬象伊始，從心紀元。/);
  assert.doesNotMatch(zhTw, /本站為個人維護的非營利分享站，用於展示與分享伺服器專案、設定與玩家入口。/);
  assert.doesNotMatch(zhTw, /這裡先是分享站，再是玩家真正進入這個世界的入口。/);
  assert.doesNotMatch(zhTw, /主站會保持分享站的外觀與口吻/);
  assert.doesNotMatch(zhTw, /PERSONAL_SITE_ONLINE/);

  assert.match(en, /A personal steampunk-fantasy Minecraft world/);
  assert.match(en, /Enter Player Portal/);
  assert.match(en, /Access Matrix/);
  assert.match(en, /All beginnings lead through Xin Era\./);
  assert.doesNotMatch(en, /A personally maintained non-commercial share site/);

  assert.match(ja, /個人で長く運営しているスチームファンタジーの Minecraft ワールド/);
  assert.match(ja, /プレイヤーポータルへ/);
  assert.match(ja, /万象の始まりは、心紀元から。/);
});

test("dispatch CTA section keeps decorative layers behind clickable content", () => {
  const html = render("zh-CN");

  assert.match(
    html,
    /class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-\[0\.1\]"/,
  );
  assert.match(
    html,
    /class="pointer-events-none absolute inset-0 bg-\[linear-gradient\(180deg,rgba\(11,14,17,0\.38\),rgba\(11,14,17,0\.88\)\)\]"/,
  );
  assert.match(html, /class="relative z-10 mx-auto max-w-4xl text-center"/);
});

test("landing hero renders the dedicated entry-station banner scaffold", () => {
  const html = render("zh-CN");

  assert.match(html, /data-hero-grid="entry-station"/);
  assert.match(html, /data-grid-columns="24"/);
  assert.match(html, /data-grid-rows="14"/);
  assert.match(html, /rotateX\(12deg\)_rotateY\(-18deg\)_rotateZ\(-1\.9deg\)/);
});

test("landing page mounts the system signal band and only the limited magnetic targets", () => {
  const html = render("zh-CN");

  assert.match(html, /data-signal-band="world-entry"/);
  assert.match(html, /data-magnetic-target="hero-primary"/);
  assert.match(html, /data-magnetic-target="access-card"/);
  assert.doesNotMatch(html, /data-magnetic-target="route-card"/);
});
