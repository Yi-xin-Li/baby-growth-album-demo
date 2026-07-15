import type { IllustrationSlotId, ThemeId } from "@/types/album";

export type AlbumTheme = {
  id: ThemeId;
  name: string;
  englishName: string;
  description: string;
  motif: string;
  swatches: [string, string, string];
  illustrations: Record<IllustrationSlotId, string>;
  motion: {
    decoration: "float" | "sway" | "twinkle";
    timelineDuration: number;
  };
};

function originalIllustrations(): Record<IllustrationSlotId, string> {
  return {
    coverHero: "/images/cover_baby.png",
    coverDecoration: "/images/decro_baby.png",
    pageTexture: "",
    chapterIcon: "/images/icon_birth.png",
    timelineMarker: "/images/icon_car.png",
    cardDecoration: "/images/decro_baby.png",
    noteDecoration: "/images/letter.png",
    noteBackground: "",
    emptyState: "/images/icon_continue.png",
  };
}

export const albumThemes: Record<ThemeId, AlbumTheme> = {
  scrapbook: {
    id: "scrapbook",
    name: "奶油手账本",
    englishName: "Cream Scrapbook",
    description: "撕纸、贴纸和蜡笔笔触组成的温暖成长手账。",
    motif: "✿",
    swatches: ["#f8f0e3", "#e7b8a5", "#b9c68e"],
    illustrations: originalIllustrations(),
    motion: { decoration: "float", timelineDuration: 0.8 },
  },
  forest: {
    id: "forest",
    name: "森林成长记",
    englishName: "Forest Journal",
    description: "水彩植物、小动物与藤蔓串起自然的成长章节。",
    motif: "❧",
    swatches: ["#eef1df", "#8fa987", "#d4aa78"],
    illustrations: originalIllustrations(),
    motion: { decoration: "sway", timelineDuration: 1 },
  },
  space: {
    id: "space",
    name: "星空冒险记",
    englishName: "Starry Adventure",
    description: "星球、飞船和柔和星光陪伴每一次勇敢探索。",
    motif: "✦",
    swatches: ["#eef0fa", "#7b83ad", "#e5b96f"],
    illustrations: originalIllustrations(),
    motion: { decoration: "twinkle", timelineDuration: 1.1 },
  },
};

export const albumThemeList = Object.values(albumThemes);
