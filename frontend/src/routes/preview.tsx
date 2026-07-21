import { createFileRoute } from "@tanstack/react-router";
import { AlbumPage } from "./index";

export const Route = createFileRoute("/preview")({
  head: () => ({ meta: [{ title: "相册预览｜宝宝成长相册" }] }),
  component: AlbumPage,
});
