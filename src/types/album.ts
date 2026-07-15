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
  profile: AlbumProfile;
  theme: "cream" | "nature" | "candy";
  chapters: Chapter[];
};
