export interface Playlist {
  id: string;
  name: string;
  description: string;
  images: { url: string; height: number | null; width: number | null }[];
  tracks: {
    total: number;
    href: string;
  };
  external_urls: {
    spotify: string;
  };
  owner: {
    display_name: string;
    id: string;
  };
} 