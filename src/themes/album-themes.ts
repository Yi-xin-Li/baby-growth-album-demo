import type { IllustrationSlotId, ThemeId } from "@/types/album";
import scrapbookMarker from "@/assets/themes/scrapbook/marker.svg?url";

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

function themeIllustrations(marker: string): Record<IllustrationSlotId, string> {
  return {
    coverHero: "/images/cover_baby.svg",
    coverDecoration: "/images/decro_baby.png",
    pageTexture: "",
    chapterIcon: marker,
    timelineMarker: marker,
    cardDecoration: marker,
    noteDecoration: "/images/letter.png",
    noteBackground: "",
    emptyState: "/images/icon_continue.png",
  };
}

export const fixedAlbumTheme: AlbumTheme = {
  id: "scrapbook",
  name: "宝宝成长相册",
  englishName: "Baby Growth Album",
  description: "Demo 1.0 固定画风",
  motif: "✿",
  swatches: ["#faf7ef", "#e7b8a5", "#b9c68e"],
  illustrations: themeIllustrations(scrapbookMarker),
  motion: { decoration: "float", timelineDuration: 0.8 },
};
