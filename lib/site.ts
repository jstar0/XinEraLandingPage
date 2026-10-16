/** Existing service destinations; availability is not inferred from these links. */
export const site = {
  name: "心纪元",
  tagline: "万象伊始，从心纪元。",
  description:
    "心纪元，一个以幻想中世纪与蒸汽朋克为背景的 Minecraft 原创剧情 RPG。从逃难之路走向城邦与骑士的故事，先在这里认识旅途中的人和地方。",
  url: "https://www.mcxin.top",
  services: {
    account: "https://accounts.mcxin.top/",
    map: "https://map.mcxin.top/",
    status: "https://status.mcxin.top/",
  },
  filing: {
    label: "鲁ICP备2025206170号-1",
    href: "https://beian.miit.gov.cn/",
  },
} as const;
export const asset = (name: string) => `/xinera/${name}`;
