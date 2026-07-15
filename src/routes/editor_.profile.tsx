import { createFileRoute } from "@tanstack/react-router";
import { AlbumEditor } from "./editor";

export const Route = createFileRoute("/editor_/profile")({
  head: () => ({ meta: [{ title: "宝宝资料｜宝宝成长相册" }] }),
  component: () => <AlbumEditor mode="profile" />,
});
