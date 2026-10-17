/** Public story introductions. Source boundaries are recorded in docs/content-sources.md. */
export type JournalEntry = {
  slug: string;
  title: string;
  place: string;
  summary: string;
  image: string;
  sections: readonly { heading: string; paragraphs: readonly string[] }[];
};
export const entries = [
  {
    slug: "courtyard",
    title: "离开故乡以后",
    place: "西奥格勒 · 教堂庭院",
    summary: "从奥摩西亚的战火中出逃，在陌生的城镇里寻找容身之处。",
    image: "/xinera/courtyard.webp",
    sections: [
      {
        heading: "故事从一次逃难开始。",
        paragraphs: [
          "9012 年七月，奥摩西亚皇城被叛军攻占。离开故乡时，你还不是骑士，只是一个必须活下去的人。穿过奥歌维拉森林，克莱尔镇出现在前方。",
          "这里属于新纪元联邦。铁匠铺、武器店、城门和街上的居民，渐渐组成了另一种生活。你仍是异乡人，却开始希望能在这里留下来。",
        ],
      },
      {
        heading: "城镇里，有需要认识的人。",
        paragraphs: [
          "心纪元的旅途从逃难延伸向五座城市。每一座城都有自己的风土人情，也有藏在日常之下的纠葛。走进街巷，与人交谈，才会慢慢明白那些与你擦肩而过的人为何停留于此。",
          "从克莱尔到西奥格勒，离家的路逐渐有了新的方向。前方是骑士团，是一次宣誓，也是一个问题：当你终于有能力握住剑，要用它守护什么？",
        ],
      },
      {
        heading: "剑与魔法之间，蒸汽正在升起。",
        paragraphs: [
          "幻想中世纪与蒸汽朋克，构成了心纪元的世界底色。城邦、骑士与魔法之外，还有黄铜、管道和机械。主线故事、城镇探索与战斗，都从这个世界里展开。",
          "这页手记只写旅途的开端。后来的相遇与去向，留给故事本身。",
        ],
      },
    ],
  },
  {
    slug: "hall",
    title: "骑士，因何而战",
    place: "西奥格勒 · 彩窗大厅",
    summary: "在西奥格勒的教堂里，来自异乡的你将说出骑士的誓言。",
    image: "/xinera/hall.webp",
    sections: [
      {
        heading: "从外乡人到联邦骑士。",
        paragraphs: [
          "克莱尔之后，旅途把你带到西奥格勒。骑士团对外乡人的接纳并非理所当然；故乡的遭遇、曾经的行动，都在这里得到追问。",
          "故事来到教堂。站在彩窗之下，你即将获得新纪元联邦骑士的身份。与这个称号一同到来的，还有必须亲口说出的承诺。",
        ],
      },
      {
        heading: "誓言里，写着要守护的人。",
        paragraphs: [
          "“我发誓善待弱者。我发誓勇敢地对抗强暴。”",
          "“我发誓为手无寸铁的人战斗。我发誓帮助任何向我求救的人。”",
          "这些话是第一章中的骑士誓言。它们说的不是头衔，而是面对弱者、求助者与不公时，你愿意做些什么。",
        ],
      },
      {
        heading: "宣誓之后，路还很长。",
        paragraphs: [
          "骑士的身份让旅途继续向前。城镇中的人和事，不会因为一次仪式就变得简单。离乡时只想活下来的你，将带着这些承诺走进更大的世界。",
          "先记住这一刻的誓言。至于它会如何被考验，留在接下来的旅途中。",
        ],
      },
    ],
  },
] as const satisfies readonly JournalEntry[];
export function findEntry(slug: string): JournalEntry | undefined {
  return entries.find((entry) => entry.slug === slug);
}
