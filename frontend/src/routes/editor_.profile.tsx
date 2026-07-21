import { createFileRoute } from "@tanstack/react-router";
import { EditorAccessGate } from "@/components/editor/EditorAccessGate";
import { AlbumEditor } from "./editor";

export const Route = createFileRoute("/editor_/profile")({
  head: () => ({ meta: [{ title: "宝宝档案｜宝宝成长相册" }] }),
  component: () => (
    <EditorAccessGate>
      <AlbumEditor mode="profile" />
    </EditorAccessGate>
  ),
});
