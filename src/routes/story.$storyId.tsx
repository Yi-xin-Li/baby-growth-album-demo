import { createFileRoute } from "@tanstack/react-router";
import { AlbumPage } from "./index";

export const Route = createFileRoute("/story/$storyId")({
  component: StoryRoutePage,
});

function StoryRoutePage() {
  const { storyId } = Route.useParams();
  return <AlbumPage initialStoryId={storyId} />;
}
