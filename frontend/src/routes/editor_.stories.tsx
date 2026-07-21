import { createFileRoute } from "@tanstack/react-router";
import { EditorAccessGate } from "@/components/editor/EditorAccessGate";
import { AlbumEditor } from "./editor";

export const Route = createFileRoute("/editor_/stories")({
  head: () => ({ meta: [{ title: "成长记录｜宝宝成长相册" }] }),
  component: () => (
    <EditorAccessGate>
      <AlbumEditor mode="stories" />
    </EditorAccessGate>
  ),
});
