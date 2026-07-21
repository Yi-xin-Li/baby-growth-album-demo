export type ImageMedia = {
  type: "image";
  id?: string;
  thumbnailId?: string;
  previewId?: string;
  originalId?: string;
  sourceId?: string;
  src?: string;
  thumbnail?: string;
  preview?: string;
  original?: string;
  alt?: string;
};

export type VideoMedia = {
  type: "video";
  poster: string;
  videoUrl?: string;
  alt?: string;
};

export type MediaItem = ImageMedia | VideoMedia;

export interface MediaStorage {
  getThumbnail(item: ImageMedia): string;
  getPreview(item: ImageMedia): string;
  getOriginal(item: ImageMedia): string;
}

export type ThemeId = "scrapbook" | "forest" | "space";

export type IllustrationSlotId =
  | "coverHero"
  | "coverDecoration"
  | "pageTexture"
  | "chapterIcon"
  | "timelineMarker"
  | "cardDecoration"
  | "noteDecoration"
  | "noteBackground"
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
  videoPoster?: string;
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
  animationSpeed: "slow" | "normal";
  customIllustrations?: Partial<Record<IllustrationSlotId, string>>;
  customBackground?: string;
  backgroundOpacity?: number;
  backgroundMusic?: {
    source: string;
    name: string;
    volume: number;
    loop: boolean;
  };
  storagePreferences?: {
    retainOriginalPhotos: boolean;
  };
  chapters: Chapter[];
};
