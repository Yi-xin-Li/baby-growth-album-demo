import type { IllustrationSlotId, ThemeId } from "@/types/album";
import forestCover from "@/assets/themes/forest/cover.svg?url";
import forestMarker from "@/assets/themes/forest/marker.svg?url";
import scrapbookCover from "@/assets/themes/scrapbook/cover.svg?url";
import scrapbookMarker from "@/assets/themes/scrapbook/marker.svg?url";
import spaceCover from "@/assets/themes/space/cover.svg?url";
import spaceMarker from "@/assets/themes/space/marker.svg?url";

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

function themeIllustrations(cover: string, marker: string): Record<IllustrationSlotId, string> {
  return {
    coverHero: cover,
    coverDecoration: marker,
    pageTexture: "",
    chapterIcon: marker,
    timelineMarker: marker,
    cardDecoration: marker,
    noteDecoration: "/images/letter.png",
    noteBackground: "",
    emptyState: cover,
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
    illustrations: themeIllustrations(scrapbookCover, scrapbookMarker),
    motion: { decoration: "float", timelineDuration: 0.8 },
  },
  forest: {
    id: "forest",
    name: "森林成长记",
    englishName: "Forest Journal",
    description: "水彩植物、小动物与藤蔓串起自然的成长章节。",
    motif: "❧",
    swatches: ["#eef1df", "#8fa987", "#d4aa78"],
    illustrations: themeIllustrations(forestCover, forestMarker),
    motion: { decoration: "sway", timelineDuration: 1 },
  },
  space: {
    id: "space",
    name: "星空冒险记",
    englishName: "Starry Adventure",
    description: "星球、飞船和柔和星光陪伴每一次勇敢探索。",
    motif: "✦",
    swatches: ["#eef0fa", "#7b83ad", "#e5b96f"],
    illustrations: themeIllustrations(spaceCover, spaceMarker),
    motion: { decoration: "twinkle", timelineDuration: 1.1 },
  },
};

export const albumThemeList = Object.values(albumThemes);
