import { createFileRoute } from "@tanstack/react-router";
import { AlbumPage } from "./index";

export const Route = createFileRoute("/chapter/$chapterId")({
  component: ChapterRoutePage,
});

function ChapterRoutePage() {
  const { chapterId } = Route.useParams();
  return <AlbumPage initialChapterId={chapterId} />;
}
