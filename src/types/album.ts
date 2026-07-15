export type ImageMedia = {
  type: "image";
  src: string;
  alt?: string;
};

export type VideoMedia = {
  type: "video";
  poster: string;
  videoUrl?: string;
  alt?: string;
};

export type MediaItem = ImageMedia | VideoMedia;

export type ThemeId = "scrapbook" | "forest" | "space";

export type IllustrationSlotId =
  | "coverHero"
  | "coverDecoration"
  | "pageTexture"
  | "timelineMarker"
  | "noteDecoration"
  | "emptyState";

export type Story = {
  id: string;
  title: string;
  date: string;
  cover: string;
  note: string;
  thumbs: string[];
  extraCount: number;
  videoUrl?: string;
  media?: MediaItem[];
};

export type Chapter = {
  id: string;
  title: string;
  age: string;
  icon: string;
  bg: string;
  smallIcon: string;
  stories: Story[];
};

export type AlbumProfile = {
  displayName: string;
  romanizedName: string;
  birthDate: string;
  welcome: string;
};

export type GrowthAlbum = {
  id: string;
  ownerId?: string;
  slug: string;
  visibility: "public" | "unlisted" | "private";
  profile: AlbumProfile;
  theme: ThemeId;
  animationEnabled: boolean;
  chapters: Chapter[];
};
