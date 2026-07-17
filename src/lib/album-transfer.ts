import { z } from "zod";
import type { GrowthAlbum } from "@/types/album";

const albumSchema = z
  .object({
    id: z.string().min(1),
    slug: z.string().min(1),
    visibility: z.enum(["public", "unlisted", "private"]),
    profile: z.object({
      displayName: z.string(),
      romanizedName: z.string(),
      birthDate: z.string(),
      welcome: z.string(),
    }),
    theme: z.enum(["scrapbook", "forest", "space"]),
    animationEnabled: z.boolean(),
    animationSpeed: z.enum(["slow", "normal"]).default("slow"),
    customBackground: z.string().optional(),
    backgroundOpacity: z.number().min(0).max(0.65).default(0.22),
    backgroundMusic: z
      .object({
        source: z.string().min(1),
        name: z.string().min(1),
        volume: z.number().min(0).max(1).default(0.3),
        loop: z.boolean().default(true),
      })
      .optional(),
    chapters: z.array(
      z
        .object({
          id: z.string(),
          title: z.string(),
          stories: z.array(z.object({ id: z.string(), title: z.string() }).passthrough()),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export function parseAlbumJson(text: string): GrowthAlbum {
  return albumSchema.parse(JSON.parse(text)) as GrowthAlbum;
}

export function validateAlbumForExport(album: GrowthAlbum) {
  const errors: string[] = [];
  if (!album.profile.displayName.trim()) errors.push("宝宝姓名不能为空");
  if (!album.chapters.length) errors.push("至少需要一个成长章节");
  const serialized = JSON.stringify(album);
  if (/[A-Za-z]:\\(?:Users|Documents|Desktop)\\/i.test(serialized)) {
    errors.push("配置中包含电脑绝对路径，请改为项目相对路径");
  }
  return errors;
}

export function downloadAlbumJson(album: GrowthAlbum) {
  const blob = new Blob([JSON.stringify(album, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "album.json";
  anchor.click();
  URL.revokeObjectURL(url);
}
