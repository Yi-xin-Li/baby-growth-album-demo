import { createFileRoute } from "@tanstack/react-router";
import { AlbumEditor } from "./editor";

export const Route = createFileRoute("/editor_/stories")({
  head: () => ({ meta: [{ title: "成长故事｜宝宝成长相册" }] }),
  component: AlbumEditor,
});
