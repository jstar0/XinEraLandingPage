export const SUPPORTED_LOCALES = ["zh-CN", "zh-TW", "en", "ja"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

type NavLink = {
  label: string;
  href: string;
};

type FeatureCard = {
  tag: string;
  title: string;
  description: string;
  symbol: string;
};

type AccessCard = {
  tag: string;
  title: string;
  description: string;
  href: string;
  symbol: string;
};

type GalleryCard = {
  title: string;
  description: string;
  action: string;
  href: string;
};

type Dispatch = {
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
};

type HeroRoute = {
  audience: string;
  title: string;
  description: string;
  href: string;
};

type MobileDockItem = {
  href: string;
  key: "explore" | "access" | "return" | "status";
  label: string;
  symbol: string;
};

export type LandingPageCopy = {
  htmlLang: string;
  localeLabel: string;
  brand: string;
  metaLine: string;
  nav: NavLink[];
  hero: {
    plaque: string;
    title: string;
    description: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
    note: string;
    panelTitle: string;
    panelSubtitle: string;
    routes: HeroRoute[];
  };
  core: {
    title: string;
    description: string;
    ghost: string;
    cards: FeatureCard[];
  };
  gallery: {
    rightCard: GalleryCard;
  };
  access: {
    title: string;
    subtitle: string;
    cards: AccessCard[];
  };
  dispatch: Dispatch;
  mobileDock: MobileDockItem[];
  footer: {
    note: string;
    filingLabel: string;
    filingNumber: string;
    filingHref: string;
    links: NavLink[];
  };
};

const commonAccessHrefs = {
  account: "https://accounts.mcxin.top/",
  map: "https://map.mcxin.top/",
  blog: "https://blog.mcxin.top/",
  status: "https://status.mcxin.top/",
};

const officialFilingHref = "https://beian.miit.gov.cn/";

export const localeLabels: Record<SupportedLocale, string> = {
  "zh-CN": "简",
  "zh-TW": "繁",
  en: "EN",
  ja: "JP",
};

export function isChineseLocale(locale: SupportedLocale) {
  return locale === "zh-CN" || locale === "zh-TW";
}

function normalizeLocale(input?: string | null): SupportedLocale | null {
  if (!input) return null;
  const value = input.toLowerCase().replace("_", "-");

  if (
    value.startsWith("zh-tw") ||
    value.startsWith("zh-hk") ||
    value.startsWith("zh-mo") ||
    value.includes("hant")
  ) {
    return "zh-TW";
  }

  if (value.startsWith("zh")) {
    return "zh-CN";
  }

  if (value.startsWith("ja")) {
    return "ja";
  }

  if (value.startsWith("en")) {
    return "en";
  }

  return null;
}

export function resolveLocaleFromAcceptLanguage(
  headerValue?: string | null,
): SupportedLocale {
  if (!headerValue) return "zh-CN";

  for (const segment of headerValue.split(",")) {
    const candidate = segment.trim().split(";")[0];
    const locale = normalizeLocale(candidate);
    if (locale) return locale;
  }

  return "zh-CN";
}

export function resolveLocaleFromNavigator(
  languages?: readonly string[],
): SupportedLocale {
  if (!languages?.length) return "zh-CN";

  for (const candidate of languages) {
    const locale = normalizeLocale(candidate);
    if (locale) return locale;
  }

  return "zh-CN";
}

export const landingCopy: Record<SupportedLocale, LandingPageCopy> = {
  "zh-CN": {
    htmlLang: "zh-CN",
    localeLabel: "简体中文",
    brand: "XIN ERA ARCHIVE",
    metaLine: "心纪元分享站",
    nav: [
      { label: "世界核心", href: "#core" },
      { label: "玩家入口", href: "#access" },
      { label: "项目记录", href: commonAccessHrefs.blog },
    ],
    hero: {
      plaque: "个人长期维护 • 蒸汽幻想 Minecraft 世界",
      title: "心纪元",
      description:
        "一个由个人长期维护的蒸汽幻想 Minecraft 世界。城邦、职业、试炼与长期更新，会在这里继续展开。",
      primaryLabel: "进入玩家入口",
      primaryHref: commonAccessHrefs.account,
      secondaryLabel: "查看项目记录",
      secondaryHref: commonAccessHrefs.blog,
      note: "",
      panelTitle: "从这里开始",
      panelSubtitle: "万象伊始，从心纪元。",
      routes: [
        {
          audience: "第一次来到这里",
          title: "先看世界地图",
          description: "先快速认识主城、区域与世界轮廓，再决定要不要更深入地进入这里。",
          href: commonAccessHrefs.map,
        },
        {
          audience: "已经在游玩",
          title: "打开玩家入口",
          description: "登录、注册与账号相关操作统一从这里进入，服务状态也能顺手查看。",
          href: commonAccessHrefs.account,
        },
        {
          audience: "准备回来看看",
          title: "阅读项目记录",
          description: "从开发记录、设定碎片与更新里，快速找回这个世界最近发生了什么。",
          href: commonAccessHrefs.blog,
        },
      ],
    },
    core: {
      title: "世界核心",
      description:
        "从剧情、职业到高塔与锻造，这些系统共同决定了心纪元不只是一个地图，而是一个持续长大的世界。",
      ghost: "WORLD SYSTEMS",
      cards: [
        {
          tag: "叙事",
          title: "剧情章节",
          description:
            "主线与角色线会把城邦、人物与冲突串起来，让探索像真正进入一个有时间感的世界。",
          symbol: "✦",
        },
        {
          tag: "职业",
          title: "职业转职",
          description:
            "从法师与战士出发，延展出咒灵、德鲁伊、牧师、铁卫、先锋与弓箭手等路线。",
          symbol: "⌘",
        },
        {
          tag: "试炼",
          title: "肉鸽高塔",
          description:
            "独立节奏的高塔玩法会把随机房间、BUFF 选择与高风险推进推到更前面。",
          symbol: "▣",
        },
        {
          tag: "锻造",
          title: "锻造与装备",
          description:
            "强化、镶嵌、重铸与品质系统一起工作，成长路径并不只是一串更大的数值。",
          symbol: "⚒",
        },
        {
          tag: "社群",
          title: "组队与工会",
          description:
            "从队伍协作到工会关系，心纪元想保留的是多人世界真正会形成的长期联系。",
          symbol: "◉",
        },
        {
          tag: "收藏",
          title: "图鉴与收藏",
          description:
            "图鉴、碎片、展厅与收集记录，让留下痕迹这件事和战斗收益一样重要。",
          symbol: "▤",
        },
      ],
    },
    gallery: {
      rightCard: {
        title: "项目记录",
        description: "开发记录、设定碎片与世界更新，都整理在博客与页面里。",
        action: "阅读博客",
        href: commonAccessHrefs.blog,
      },
    },
    access: {
      title: "玩家入口矩阵",
      subtitle: "入口、地图、记录与状态被分开放好，让每一种访问意图都更直接。",
      cards: [
        {
          tag: "账号",
          title: "玩家入口",
          description: "登录、注册与账号相关操作统一从这里进入。",
          href: commonAccessHrefs.account,
          symbol: "◎",
        },
        {
          tag: "导览",
          title: "世界地图",
          description: "先看地貌、主城和区域轮廓，再决定要不要更深入地进入这里。",
          href: commonAccessHrefs.map,
          symbol: "◌",
        },
        {
          tag: "记录",
          title: "项目博客",
          description: "放开发记录、设定说明与长期更新，不把主站做成信息堆场。",
          href: commonAccessHrefs.blog,
          symbol: "⌲",
        },
        {
          tag: "状态",
          title: "服务状态",
          description: "给现有玩家看的运行状态与可用性信息，快速、直接、透明。",
          href: commonAccessHrefs.status,
          symbol: "◴",
        },
      ],
    },
    dispatch: {
      title: "入口、地图与记录，都已经放好。",
      description:
        "按你的需要，直接前往玩家入口、世界地图、项目记录或服务状态。",
      primaryLabel: "进入玩家入口",
      primaryHref: commonAccessHrefs.account,
      secondaryLabel: "打开世界地图",
      secondaryHref: commonAccessHrefs.map,
    },
    mobileDock: [
      { key: "explore", label: "探索", href: "#core", symbol: "◫" },
      { key: "access", label: "入口", href: "#access", symbol: "◎" },
      { key: "return", label: "回看", href: commonAccessHrefs.blog, symbol: "⌲" },
      { key: "status", label: "状态", href: commonAccessHrefs.status, symbol: "◴" },
    ],
    footer: {
      note: "",
      filingLabel: "备案信息",
      filingNumber: "鲁ICP备2025206170号-1",
      filingHref: officialFilingHref,
      links: [
        { label: "博客", href: commonAccessHrefs.blog },
        { label: "地图", href: commonAccessHrefs.map },
        { label: "状态", href: commonAccessHrefs.status },
      ],
    },
  },
  "zh-TW": {
    htmlLang: "zh-Hant",
    localeLabel: "繁體中文",
    brand: "XIN ERA ARCHIVE",
    metaLine: "心紀元分享站",
    nav: [
      { label: "世界核心", href: "#core" },
      { label: "玩家入口", href: "#access" },
      { label: "專案記錄", href: commonAccessHrefs.blog },
    ],
    hero: {
      plaque: "個人長期維護 • 蒸汽幻想 Minecraft 世界",
      title: "心紀元",
      description:
        "一個由個人長期維護的蒸汽幻想 Minecraft 世界。城邦、職業、試煉與長期更新，都會在這裡持續展開。",
      primaryLabel: "進入玩家入口",
      primaryHref: commonAccessHrefs.account,
      secondaryLabel: "查看專案記錄",
      secondaryHref: commonAccessHrefs.blog,
      note: "",
      panelTitle: "從這裡開始",
      panelSubtitle: "萬象伊始，從心紀元。",
      routes: [
        {
          audience: "第一次來到這裡",
          title: "先看世界地圖",
          description: "先快速認識主城、區域與世界輪廓，再決定要不要更深入地進入這裡。",
          href: commonAccessHrefs.map,
        },
        {
          audience: "已經在遊玩",
          title: "打開玩家入口",
          description: "登入、註冊與帳號相關操作統一從這裡進入，服務狀態也能順手查看。",
          href: commonAccessHrefs.account,
        },
        {
          audience: "準備回來看看",
          title: "閱讀專案記錄",
          description: "從開發記錄、設定碎片與更新裡，快速找回這個世界最近發生了什麼。",
          href: commonAccessHrefs.blog,
        },
      ],
    },
    core: {
      title: "世界核心",
      description:
        "從劇情、職業到高塔與鍛造，這些系統共同決定了心紀元不只是一張地圖，而是一個持續生長的世界。",
      ghost: "WORLD SYSTEMS",
      cards: [
        {
          tag: "敘事",
          title: "劇情章節",
          description:
            "主線與角色線會把城邦、人物與衝突串起來，讓探索像真正進入一個有時間感的世界。",
          symbol: "✦",
        },
        {
          tag: "職業",
          title: "職業轉職",
          description:
            "從法師與戰士出發，延展出咒靈、德魯伊、牧師、鐵衛、先鋒與弓箭手等路線。",
          symbol: "⌘",
        },
        {
          tag: "試煉",
          title: "肉鴿高塔",
          description:
            "獨立節奏的高塔玩法會把隨機房間、BUFF 選擇與高風險推進放到更前面。",
          symbol: "▣",
        },
        {
          tag: "鍛造",
          title: "鍛造與裝備",
          description:
            "強化、鑲嵌、重鑄與品質系統一起運作，成長路徑並不只是一串更大的數值。",
          symbol: "⚒",
        },
        {
          tag: "社群",
          title: "組隊與工會",
          description:
            "從隊伍協作到工會關係，心紀元想保留的是多人世界真正會形成的長期連結。",
          symbol: "◉",
        },
        {
          tag: "收藏",
          title: "圖鑑與收藏",
          description:
            "圖鑑、碎片、展廳與收集記錄，讓留下痕跡這件事與戰鬥收益一樣重要。",
          symbol: "▤",
        },
      ],
    },
    gallery: {
      rightCard: {
        title: "專案記錄",
        description: "開發記錄、設定碎片與世界更新，都整理在部落格與頁面裡。",
        action: "閱讀部落格",
        href: commonAccessHrefs.blog,
      },
    },
    access: {
      title: "玩家入口矩陣",
      subtitle: "入口、地圖、記錄與狀態被分開整理，讓每一種訪問意圖都更直接。",
      cards: [
        {
          tag: "帳號",
          title: "玩家入口",
          description: "登入、註冊與帳號相關操作統一從這裡進入。",
          href: commonAccessHrefs.account,
          symbol: "◎",
        },
        {
          tag: "導覽",
          title: "世界地圖",
          description: "先看地貌、主城與區域輪廓，再決定要不要更深入地進入這裡。",
          href: commonAccessHrefs.map,
          symbol: "◌",
        },
        {
          tag: "記錄",
          title: "專案部落格",
          description: "放開發記錄、設定說明與長期更新，不把主站做成資訊堆場。",
          href: commonAccessHrefs.blog,
          symbol: "⌲",
        },
        {
          tag: "狀態",
          title: "服務狀態",
          description: "給現有玩家看的運行狀態與可用性資訊，快速、直接、透明。",
          href: commonAccessHrefs.status,
          symbol: "◴",
        },
      ],
    },
    dispatch: {
      title: "入口、地圖與記錄，都已經放好。",
      description:
        "依照你的需要，直接前往玩家入口、世界地圖、專案記錄或服務狀態。",
      primaryLabel: "進入玩家入口",
      primaryHref: commonAccessHrefs.account,
      secondaryLabel: "打開世界地圖",
      secondaryHref: commonAccessHrefs.map,
    },
    mobileDock: [
      { key: "explore", label: "探索", href: "#core", symbol: "◫" },
      { key: "access", label: "入口", href: "#access", symbol: "◎" },
      { key: "return", label: "回看", href: commonAccessHrefs.blog, symbol: "⌲" },
      { key: "status", label: "狀態", href: commonAccessHrefs.status, symbol: "◴" },
    ],
    footer: {
      note: "",
      filingLabel: "備案資訊",
      filingNumber: "魯ICP備2025206170號-1",
      filingHref: officialFilingHref,
      links: [
        { label: "部落格", href: commonAccessHrefs.blog },
        { label: "地圖", href: commonAccessHrefs.map },
        { label: "狀態", href: commonAccessHrefs.status },
      ],
    },
  },
  en: {
    htmlLang: "en",
    localeLabel: "English",
    brand: "XIN ERA ARCHIVE",
    metaLine: "Xin Era Share Site",
    nav: [
      { label: "Core", href: "#core" },
      { label: "Player Access", href: "#access" },
      { label: "Chronicles", href: commonAccessHrefs.blog },
    ],
    hero: {
      plaque: "Personally maintained • Steampunk fantasy Minecraft world",
      title: "Xin Era",
      description:
        "A personal steampunk-fantasy Minecraft world maintained long term. Cities, class paths, trials, and updates keep unfolding here.",
      primaryLabel: "Enter Player Portal",
      primaryHref: commonAccessHrefs.account,
      secondaryLabel: "Read the Chronicles",
      secondaryHref: commonAccessHrefs.blog,
      note: "",
      panelTitle: "Start Here",
      panelSubtitle: "All beginnings lead through Xin Era.",
      routes: [
        {
          audience: "New here",
          title: "Survey the World Map",
          description: "Get a fast read on the capital, regions, and overall geography before committing to a deeper dive.",
          href: commonAccessHrefs.map,
        },
        {
          audience: "Already playing",
          title: "Open the Player Portal",
          description: "Accounts, sign-in, and the practical day-to-day entry point all start here.",
          href: commonAccessHrefs.account,
        },
        {
          audience: "Coming back",
          title: "Read the Chronicles",
          description: "Use the dev logs, setting notes, and updates to quickly catch up with what changed.",
          href: commonAccessHrefs.blog,
        },
      ],
    },
    core: {
      title: "World Core",
      description:
        "Story chapters, class paths, towers, forging, guild play, and collections are what make Xin Era feel like a world instead of a page of features.",
      ghost: "WORLD SYSTEMS",
      cards: [
        {
          tag: "Story",
          title: "Story Chapters",
          description:
            "Mainline and character arcs turn cities, factions, and conflicts into a world with memory rather than a checklist of quests.",
          symbol: "✦",
        },
        {
          tag: "Classes",
          title: "Class Paths",
          description:
            "Mage and Warrior branch into more specialized identities, giving builds and combat pacing room to develop.",
          symbol: "⌘",
        },
        {
          tag: "Trials",
          title: "Tower Trials",
          description:
            "Roguelike tower runs push random rooms, buffs, and risky progression to the front of the experience.",
          symbol: "▣",
        },
        {
          tag: "Forge",
          title: "Forging & Gear",
          description:
            "Upgrades, gem slots, reforging, and item tiers work together so growth is more than just bigger numbers.",
          symbol: "⚒",
        },
        {
          tag: "Guilds",
          title: "Parties & Guilds",
          description:
            "Xin Era keeps space for the long-term relationships that multiplayer worlds are supposed to create.",
          symbol: "◉",
        },
        {
          tag: "Archive",
          title: "Collections",
          description:
            "Bestiaries, fragments, exhibits, and records make leaving traces in the world feel as meaningful as combat rewards.",
          symbol: "▤",
        },
      ],
    },
    gallery: {
      rightCard: {
        title: "Chronicles",
        description: "Development notes, setting fragments, and world updates are organized in the blog and project logs.",
        action: "Open the Blog",
        href: commonAccessHrefs.blog,
      },
    },
    access: {
      title: "Access Matrix",
      subtitle: "The portal, map, chronicles, and service status are separated so every visit can stay focused.",
      cards: [
        {
          tag: "Portal",
          title: "Accounts",
          description: "Login, registration, and identity management all start here.",
          href: commonAccessHrefs.account,
          symbol: "◎",
        },
        {
          tag: "Map",
          title: "World Map",
          description: "Survey the terrain, settlements, and regions before stepping deeper into the world.",
          href: commonAccessHrefs.map,
          symbol: "◌",
        },
        {
          tag: "Logs",
          title: "Blog",
          description: "The long-term record for development notes, setting fragments, and project updates.",
          href: commonAccessHrefs.blog,
          symbol: "⌲",
        },
        {
          tag: "Live",
          title: "Status",
          description: "Operational information for current players: direct, visible, and useful.",
          href: commonAccessHrefs.status,
          symbol: "◴",
        },
      ],
    },
    dispatch: {
      title: "Portal, map, and chronicles are already in place.",
      description:
        "Jump directly to the player portal, world map, chronicles, or live service status.",
      primaryLabel: "Enter Player Portal",
      primaryHref: commonAccessHrefs.account,
      secondaryLabel: "Open the World Map",
      secondaryHref: commonAccessHrefs.map,
    },
    mobileDock: [
      { key: "explore", label: "Explore", href: "#core", symbol: "◫" },
      { key: "access", label: "Access", href: "#access", symbol: "◎" },
      { key: "return", label: "Return", href: commonAccessHrefs.blog, symbol: "⌲" },
      { key: "status", label: "Status", href: commonAccessHrefs.status, symbol: "◴" },
    ],
    footer: {
      note: "",
      filingLabel: "Filing",
      filingNumber: "Lu ICP Bei 2025206170-1",
      filingHref: officialFilingHref,
      links: [
        { label: "Blog", href: commonAccessHrefs.blog },
        { label: "Map", href: commonAccessHrefs.map },
        { label: "Status", href: commonAccessHrefs.status },
      ],
    },
  },
  ja: {
    htmlLang: "ja",
    localeLabel: "日本語",
    brand: "XIN ERA ARCHIVE",
    metaLine: "Xin Era 共有サイト",
    nav: [
      { label: "コア", href: "#core" },
      { label: "プレイヤー入口", href: "#access" },
      { label: "記録", href: commonAccessHrefs.blog },
    ],
    hero: {
      plaque: "個人で長期運営 • スチームファンタジーの Minecraft 世界",
      title: "Xin Era",
      description:
        "個人で長く運営しているスチームファンタジーの Minecraft ワールド。都市、職業、試練、更新がこの場所で積み重なっていきます。",
      primaryLabel: "プレイヤーポータルへ",
      primaryHref: commonAccessHrefs.account,
      secondaryLabel: "記録を読む",
      secondaryHref: commonAccessHrefs.blog,
      note: "",
      panelTitle: "ここから始める",
      panelSubtitle: "万象の始まりは、心紀元から。",
      routes: [
        {
          audience: "初めて来た人へ",
          title: "先にワールドマップを見る",
          description: "主都、地域、全体の輪郭を先に把握してから、より深く入るか決められます。",
          href: commonAccessHrefs.map,
        },
        {
          audience: "すでに遊んでいる人へ",
          title: "プレイヤー入口を開く",
          description: "ログイン、登録、アカウント関連の操作はここから始まります。",
          href: commonAccessHrefs.account,
        },
        {
          audience: "戻ってきた人へ",
          title: "記録を読む",
          description: "開発記録、設定、更新から、この世界の変化をすばやく追えます。",
          href: commonAccessHrefs.blog,
        },
      ],
    },
    core: {
      title: "World Core",
      description:
        "ストーリー、職業分岐、高塔、鍛造、ギルド、収集。Xin Era を単なるランディングページではなく世界にしている要素です。",
      ghost: "WORLD SYSTEMS",
      cards: [
        {
          tag: "Story",
          title: "ストーリー章",
          description:
            "メインラインと人物線が都市、勢力、対立を結び、世界に時間の厚みを与えます。",
          symbol: "✦",
        },
        {
          tag: "Classes",
          title: "職業分岐",
          description:
            "魔法使いと戦士からさらに多くの進路へ分かれ、ビルドと戦闘感が育っていきます。",
          symbol: "⌘",
        },
        {
          tag: "Trials",
          title: "高塔試練",
          description:
            "ローグライク型の高塔は、ランダム部屋、強化選択、危険な前進を前面に押し出します。",
          symbol: "▣",
        },
        {
          tag: "Forge",
          title: "鍛造と装備",
          description:
            "強化、ソケット、再鍛造、装備品質が組み合わさり、成長は数値だけで終わりません。",
          symbol: "⚒",
        },
        {
          tag: "Guilds",
          title: "パーティーとギルド",
          description:
            "マルチプレイの世界だからこそ生まれる、長く続くつながりを残したいと考えています。",
          symbol: "◉",
        },
        {
          tag: "Archive",
          title: "図鑑と収集",
          description:
            "図鑑、欠片、展示、記録によって、世界に痕跡を残すこと自体が報酬になります。",
          symbol: "▤",
        },
      ],
    },
    gallery: {
      rightCard: {
        title: "記録",
        description: "開発ノート、設定断片、更新情報はブログと記録ページに整理してあります。",
        action: "ブログを開く",
        href: commonAccessHrefs.blog,
      },
    },
    access: {
      title: "Access Matrix",
      subtitle: "入口、地図、記録、状態を分けておくことで、どの訪問でも迷わず進めます。",
      cards: [
        {
          tag: "Portal",
          title: "プレイヤー入口",
          description: "ログイン、登録、アカウント関連の操作はここから始まります。",
          href: commonAccessHrefs.account,
          symbol: "◎",
        },
        {
          tag: "Map",
          title: "ワールドマップ",
          description: "地形や拠点、地域の輪郭を先に見てから世界へ踏み込めます。",
          href: commonAccessHrefs.map,
          symbol: "◌",
        },
        {
          tag: "Logs",
          title: "ブログ",
          description: "開発記録、設定、長期アップデートを蓄積していく場所です。",
          href: commonAccessHrefs.blog,
          symbol: "⌲",
        },
        {
          tag: "Live",
          title: "状態",
          description: "現在のプレイヤー向けに、稼働状況と可用性をわかりやすく示します。",
          href: commonAccessHrefs.status,
          symbol: "◴",
        },
      ],
    },
    dispatch: {
      title: "入口、地図、記録はすでに整理してあります。",
      description:
        "プレイヤー入口、ワールドマップ、記録、稼働状況へそのまま進めます。",
      primaryLabel: "プレイヤーポータルへ",
      primaryHref: commonAccessHrefs.account,
      secondaryLabel: "ワールドマップを開く",
      secondaryHref: commonAccessHrefs.map,
    },
    mobileDock: [
      { key: "explore", label: "探索", href: "#core", symbol: "◫" },
      { key: "access", label: "入口", href: "#access", symbol: "◎" },
      { key: "return", label: "再訪", href: commonAccessHrefs.blog, symbol: "⌲" },
      { key: "status", label: "状態", href: commonAccessHrefs.status, symbol: "◴" },
    ],
    footer: {
      note: "サーバープロジェクト、設定、プレイヤー入口を紹介する、個人運営の非営利共有サイトです。",
      filingLabel: "备案",
      filingNumber: "鲁ICP备2025206170号-1",
      filingHref: officialFilingHref,
      links: [
        { label: "ブログ", href: commonAccessHrefs.blog },
        { label: "マップ", href: commonAccessHrefs.map },
        { label: "状態", href: commonAccessHrefs.status },
      ],
    },
  },
};
