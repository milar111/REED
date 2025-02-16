export interface Image {
    url: string;
    height: number | null;
    width: number | null;
  }
  
  export interface Owner {
    id: string;
    display_name: string;
  }
  
  export interface Tracks {
    total: number;
  }
  
  export interface Playlist {
    id: string;
    name: string;
    images: Image[];
    owner: Owner;
    tracks: Tracks;
  }