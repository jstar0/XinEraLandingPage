export const galleryPlaces = [
  "volcano",
  "courtyard",
  "hall",
  "claire",
  "west",
  "asa",
  "royal",
  "north",
] as const;
export type GalleryPlace = (typeof galleryPlaces)[number];
export type IslandView = "island" | "crater" | "coast";
export type GallerySettings = {
  night: boolean;
  touring: boolean;
  route: IslandView;
};

export const islandRoutes = [
  { id: "coast", label: "沿岸", description: "掠过海面，沿着海岸看山" },
  { id: "crater", label: "火山", description: "越过山脊，俯看熔岩口" },
  { id: "island", label: "全景", description: "从高处看完整岛屿与海岸" },
] as const;

export function galleryPlace(
  value: string | string[] | undefined,
): GalleryPlace {
  return galleryPlaces.find((place) => place === value) ?? "volcano";
}

type GalleryScene = {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  kind: string;
  coordinates: readonly [number, number];
  journal?: string;
  routes: readonly { id: IslandView; label: string; description: string }[];
};

export const scenes: Record<GalleryPlace, GalleryScene> = {
  volcano: {
    title: "东侧火山岛",
    description: "循着海岸，看看山顶的火光。",
    image: "/xinera/gallery/volcano-poster.webp",
    kind: "远方 · 山海",
    imageAlt: "从海上俯瞰火山岛，林地围绕着岩石山体与熔岩口",
    coordinates: [1432, -1092],
    routes: islandRoutes,
  },
  courtyard: {
    title: "西奥格勒 · 教堂庭院",
    description: "走近西奥格勒的教堂。关于骑士的故事，从这里翻开一页。",
    image: "/xinera/gallery/courtyard-poster.webp",
    kind: "西奥格勒 · 庭院",
    imageAlt: "西奥格勒教堂外的庭院、台阶与拱廊",
    coordinates: [260, -811],
    journal: "/journal/courtyard",
    routes: [
      { id: "coast", label: "前庭", description: "沿着庭院走近教堂" },
      { id: "crater", label: "彩窗", description: "看看窗边与墙面的细节" },
      { id: "island", label: "塔楼", description: "从庭院仰望教堂的高塔" },
    ],
  },
  hall: {
    title: "西奥格勒 · 彩窗大厅",
    description: "在教堂的彩窗之下，读一读关于骑士与誓言的故事。",
    image: "/xinera/gallery/hall-poster.webp",
    kind: "西奥格勒 · 教堂",
    imageAlt: "彩窗大厅中的红毯、立柱与高拱顶",
    coordinates: [175, -815],
    journal: "/journal/hall",
    routes: [
      { id: "coast", label: "红毯", description: "沿红毯走进大厅" },
      { id: "crater", label: "彩窗", description: "看光从彩窗落下" },
      { id: "island", label: "拱顶", description: "抬头欣赏立柱与拱顶" },
    ],
  },
  claire: {
    title: "克莱尔一带",
    description:
      "逃难之后，克莱尔成为旅途中的落脚之处。先看看镇旁的屋顶与林地。",
    image: "/xinera/gallery/claire-poster.webp",
    imageAlt: "克莱尔镇附近的房屋与林地",
    kind: "克莱尔 · 镇郊",
    coordinates: [-48, -553],
    routes: [
      { id: "coast", label: "街边", description: "循着街边看房屋与树影" },
      { id: "crater", label: "屋顶", description: "从屋顶之间看小镇的层次" },
      { id: "island", label: "全景", description: "从高处看小镇与林地" },
    ],
  },
  west: {
    title: "西奥格勒 · 北侧城堡",
    description: "骑士的旅途通向西奥格勒。从圆庭出发，看看这片城堡与塔楼。",
    image: "/xinera/gallery/west-poster.webp",
    imageAlt: "西奥格勒附近的城堡、高墙与圆庭",
    kind: "西奥格勒 · 城堡",
    coordinates: [268, -958],
    routes: [
      { id: "coast", label: "圆庭", description: "从圆庭上方看城堡" },
      { id: "crater", label: "塔楼", description: "看看高墙与塔楼的细节" },
      { id: "island", label: "全景", description: "从上方欣赏城堡全貌" },
    ],
  },
  asa: {
    title: "阿萨一带",
    description: "把目光转向阿萨。木框房屋与石墙之间，还有下一段路。",
    image: "/xinera/gallery/asa-poster.webp",
    imageAlt: "阿萨附近由木框房屋、石墙与屋檐围合的街区",
    kind: "阿萨 · 街区",
    coordinates: [-175, -980],
    routes: [
      { id: "coast", label: "街巷", description: "循着屋顶看街区的层次" },
      { id: "crater", label: "屋檐", description: "近看屋檐与建筑细节" },
      { id: "island", label: "全景", description: "看街巷与房屋的布局" },
    ],
  },
  royal: {
    title: "奥摩皇城周边",
    description: "故事从奥摩西亚的离乱开始。这里收下一角皇城周边的雪色与庭阁。",
    image: "/xinera/gallery/royal-poster.webp",
    imageAlt: "奥摩皇城周边选区内的雪地庭阁与屋檐",
    kind: "皇城周边 · 雪庭",
    coordinates: [-285, -65],
    routes: [
      { id: "coast", label: "庭院", description: "沿着雪中庭院缓缓看过去" },
      { id: "crater", label: "屋檐", description: "走近屋檐与建筑的细节" },
      { id: "island", label: "全景", description: "看雪中的建筑群展开" },
    ],
  },
  north: {
    title: "北方海湾",
    description: "从水岸到雪坡，看海湾慢慢展开。",
    image: "/xinera/gallery/north-poster.webp",
    imageAlt: "北方雪地中的海湾、岸线与雪坡",
    kind: "远方 · 海湾",
    coordinates: [620, -1920],
    routes: [
      { id: "coast", label: "沿岸", description: "循着海湾岸线慢慢走" },
      { id: "crater", label: "雪坡", description: "近看湾边的雪坡与地形" },
      { id: "island", label: "全景", description: "从高处看海湾与远岸" },
    ],
  },
};
