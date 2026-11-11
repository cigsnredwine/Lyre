import { axiosInstance } from '@/lib/axios';
export type Version = {
    _id: string;
    label: string;
    note: string;
    duration: number;
    audioUrl: string;
    isPublic: boolean;
    createdAt: string;
};
export type Project = {
    _id: string;
    title: string;
    artist: string;
    artistCredits?: { name: string; accountId?: string }[];
    description: string;
    coverUrl?: string;
    visibility: string;
    stage: string;
    ownerId: string;
    isOwner: boolean;
    isCollaborator: boolean;
    shareToken?: string;
    invitedEmails?: string[];
    isFollowing: boolean;
    followerCount: number;
    updatedAt: string;
    versions: Version[];
    posts?: {
        _id: string;
        body: string;
        imageUrl?: string;
        createdAt: string;
    }[];
    comments?: {
        _id: string;
        authorName: string;
        body: string;
        versionId: string;
        timestamp?: number;
        createdAt: string;
    }[];
};
export const stamp = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
export const date = (value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
export const media = (url?: string, share?: string | null) => {
    if (!url)
        return '';
    if (!url.startsWith('/api/projects'))
        return url;
    const api = (axiosInstance.defaults.baseURL || '/api').replace(/\/api\/?$/, '');
    return `${api}${url}${share ? `${url.includes('?') ? '&' : '?'}share=${encodeURIComponent(share)}` : ''}`;
};
export async function duration(file: File) {
    const url = URL.createObjectURL(file);
    try {
        return await new Promise < number > ((resolve, reject) => { const audio = new Audio(); audio.preload = 'metadata'; audio.onloadedmetadata = () => { const seconds = audio.duration; audio.src = ''; if (Number.isFinite(seconds)) resolve(seconds); else reject(Error('Could not read audio duration'));  }; audio.onerror = () => reject(Error('This audio format could not be read by your browser')); audio.src = url; });
    }
    finally {
        URL.revokeObjectURL(url);
    }
}
