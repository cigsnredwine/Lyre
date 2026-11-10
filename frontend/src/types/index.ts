export interface Song {
    _id: string;
    title: string;
    artists: string[];
    artist: string;
    albumId: string | null;
    imageUrl: string;
    audioUrl: string;
    projectId?: string;
    versionId?: string;
    versionLabel?: string;
    duration: number;
    createdAt: string;
    updatedAt: string;
}

export interface Album {
    _id: string;
    title: string;
    artist: string;
    imageUrl: string;
    releaseYear: number;
    songs: Song[];
    createdAt: Date;
    updatedAt: Date;
}

export interface Stats{
    totalSongs: number;
    totalAlbums: number;
    totalArtists: number;
    totalUsers: number;
}

export interface Message {
	_id: string;
	senderId: string;
	receiverId: string;
	content: string;
	createdAt: string;
	updatedAt: string;
}

export interface User {
	_id: string;
	authUserId: string;
	email: string;
	fullName: string;
	imageUrl: string;
}
