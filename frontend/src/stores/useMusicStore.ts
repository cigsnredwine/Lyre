import {create} from 'zustand'
import { axiosInstance } from "@/lib/axios";
import type { Album, Song, Stats } from "@/types";
import toast from 'react-hot-toast';


interface MusicStore {
    songs: Song[];
    albums: Album[];
    isLoading: boolean;
    pendingRequests: number;
    error: string | null;
    currentAlbum: Album | null;
    recentlyUpdatedSongs: Song[];
    trendingSongs: Song[];
    newUploadSongs: Song[];
    stats:Stats;

    fetchAlbums: () => Promise<void>;
    fetchAlbumById: (id: string) => Promise<void>;
    fetchNewUploadSongs: () => Promise<void>;
    fetchRecentlyUpdatedSongs: () => Promise<void>;
    fetchTrendingSongs: () => Promise<void>;
    fetchStats:() => Promise<void>;
    fetchSongs: () => Promise<void>;
    fetchUploadedSongs: () => Promise<void>;
    fetchUploadedAlbums: () => Promise<void>;
    deleteSong: (id: string) => Promise<void>;
    deleteAlbum: (id: string) => Promise<void>;
}

export const useMusicStore = create<MusicStore>((set) => ({
    albums: [],
    songs: [],
    isLoading: false,
    pendingRequests: 0,
    error: null,
    currentAlbum: null,
    recentlyUpdatedSongs: [],
    newUploadSongs: [],
    trendingSongs: [],
    stats: {
        totalSongs: 0,
        totalAlbums: 0,
        totalArtists: 0,
        totalUsers: 0,
    },

    fetchSongs: async () =>{
        set(state => ({ pendingRequests: state.pendingRequests + 1, isLoading: true, error: null }))
        try {
            const response = await axiosInstance.get("/songs");
            set({songs: response.data})
        } catch (error: any) {
            set({error: error.response?.data?.message ?? "Unable to load music. Please try again."});
        } finally {
            set(state => ({ pendingRequests: Math.max(0, state.pendingRequests - 1), isLoading: state.pendingRequests > 1 }));
        }
    },

    fetchUploadedSongs: async () => {
        set(state => ({ pendingRequests: state.pendingRequests + 1, isLoading: true, error: null }));
        try {
            const response = await axiosInstance.get("/upload/songs");
            set({ songs: response.data });
        } catch (error: any) {
            set({ error: error.response?.data?.message ?? "Failed to fetch your uploaded songs" });
        } finally {
            set(state => ({ pendingRequests: Math.max(0, state.pendingRequests - 1), isLoading: state.pendingRequests > 1 }));
        }
    },

    fetchUploadedAlbums: async () => {
        set(state => ({ pendingRequests: state.pendingRequests + 1, isLoading: true, error: null }));
        try {
            const response = await axiosInstance.get("/upload/albums");
            set({ albums: response.data });
        } catch (error: any) {
            set({ error: error.response?.data?.message ?? "Failed to fetch your uploaded albums" });
        } finally {
            set(state => ({ pendingRequests: Math.max(0, state.pendingRequests - 1), isLoading: state.pendingRequests > 1 }));
        }
    },
    fetchStats: async () => {
        set(state => ({ pendingRequests: state.pendingRequests + 1, isLoading: true, error: null }))
        try {
            const response = await axiosInstance.get("/stats");
            set({stats: response.data})
        } catch (error: any) {
            set({error: error.response?.data?.message ?? "Unable to load music. Please try again."});
        } finally {
            set(state => ({ pendingRequests: Math.max(0, state.pendingRequests - 1), isLoading: state.pendingRequests > 1 }));
        }
    },

    fetchAlbums: async () => {
        set(state => ({ pendingRequests: state.pendingRequests + 1, isLoading: true, error: null }))
        try {
            const response = await axiosInstance.get("/albums");
            set({albums: response.data})
        } catch (error: any) {
            set({error: error.response?.data?.message ?? "Unable to load music. Please try again."});
        } finally {
            set(state => ({ pendingRequests: Math.max(0, state.pendingRequests - 1), isLoading: state.pendingRequests > 1 }));
        }
    },

    fetchAlbumById: async (id) => {
        set(state => ({ pendingRequests: state.pendingRequests + 1, isLoading: true, error: null, currentAlbum: null }))
        try {
            const response = await axiosInstance.get(`/albums/${id}`);
            set({ currentAlbum: response.data });
        } catch (error: any) {
            set({error: error.response?.data?.message ?? "Unable to load music. Please try again."});
        } finally {
            set(state => ({ pendingRequests: Math.max(0, state.pendingRequests - 1), isLoading: state.pendingRequests > 1 }));
        }
    },

    fetchNewUploadSongs: async () => {
        set(state => ({ pendingRequests: state.pendingRequests + 1, isLoading: true, error: null }));
        try {
            const response = await axiosInstance.get("/songs/new-uploads");
            set({ newUploadSongs: response.data });
        } catch (error: any) {
            set({error: error.response?.data?.message ?? "Unable to load music. Please try again."});
        } finally {
            set(state => ({ pendingRequests: Math.max(0, state.pendingRequests - 1), isLoading: state.pendingRequests > 1 }));
        }
    },

    fetchRecentlyUpdatedSongs: async () => {
        set(state => ({ pendingRequests: state.pendingRequests + 1, isLoading: true, error: null }));
        try {
            const response = await axiosInstance.get("/songs/recently-updated");
            set({ recentlyUpdatedSongs: response.data });
        } catch (error:any) {
            set({error: error.response?.data?.message ?? "Unable to load music. Please try again."});
        } finally{
            set(state => ({ pendingRequests: Math.max(0, state.pendingRequests - 1), isLoading: state.pendingRequests > 1 }));
        }
    },

    fetchTrendingSongs: async () => {
        set(state => ({ pendingRequests: state.pendingRequests + 1, isLoading: true, error: null }));
        try {
            const response = await axiosInstance.get("/songs/trending");
            set({ trendingSongs: response.data });
        } catch (error:any) {
            set({error: error.response?.data?.message ?? "Unable to load music. Please try again."});
        } finally{
            set(state => ({ pendingRequests: Math.max(0, state.pendingRequests - 1), isLoading: state.pendingRequests > 1 }));
        }
    },

    deleteSong: async (id) => {
		set(state => ({ pendingRequests: state.pendingRequests + 1, isLoading: true, error: null }));
		try {
			await axiosInstance.delete(`/admin/songs/${id}`);

			set((state) => ({
				songs: state.songs.filter((song) => song._id !== id),
			}));
			toast.success("Song deleted successfully");
		} catch (error: any) {
			console.log("Error in deleteSong", error);
			toast.error("Error deleting song");
		} finally {
			set(state => ({ pendingRequests: Math.max(0, state.pendingRequests - 1), isLoading: state.pendingRequests > 1 }));
		}
	},

	deleteAlbum: async (id) => {
		set(state => ({ pendingRequests: state.pendingRequests + 1, isLoading: true, error: null }));
		try {
			await axiosInstance.delete(`/admin/albums/${id}`);
			set((state) => ({
				albums: state.albums.filter((album) => album._id !== id),
				songs: state.songs.map((song) =>
					song.albumId === state.albums.find((a) => a._id === id)?.title ? { ...song, album: null } : song
				),
			}));
			toast.success("Album deleted successfully");
		} catch (error: any) {
			toast.error("Failed to delete album: " + error.message);
		} finally {
			set(state => ({ pendingRequests: Math.max(0, state.pendingRequests - 1), isLoading: state.pendingRequests > 1 }));
		}
    },

}));
