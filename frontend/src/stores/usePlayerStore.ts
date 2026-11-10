import {create} from "zustand";
import type { Song } from "@/types";

type RepeatMode = "off" | "all" | "one";

interface PlayerStore {
    currentSong: Song | null;
    isPlaying: boolean;
    queue: Song[];
    currentIndex: number;
    isShuffleEnabled: boolean;
    repeatMode: RepeatMode;
    
    initializeQueue: (queue: Song[]) => void;
    playAlbum: (songs: Song[], startIndex?:number) => void;
    setCurrentSong: (song: Song | null) => void;
    togglePlay: () => void;
    playNext: () => void;
    playPrevious: () => void;
    toggleShuffle: () => void;
    cycleRepeatMode: () => void;
}

const getRandomIndex = (queueLength: number, currentIndex: number) => {
    if(queueLength <= 1) return currentIndex;

    let nextIndex = currentIndex;

    while(nextIndex === currentIndex) {
        nextIndex = Math.floor(Math.random() * queueLength);
    }

    return nextIndex;
};

export const usePlayerStore = create<PlayerStore>((set,get) => ({
    currentSong: null,
    isPlaying: false,
    queue: [],
    currentIndex: -1,
    isShuffleEnabled: false,
    repeatMode: "off",

    initializeQueue: (songs: Song[]) => {
        set({
            queue:songs,
            currentSong: get().currentSong || songs[0],
            currentIndex: get().currentIndex == -1 ? 0 : get().currentIndex
        })
    },

    playAlbum: (songs: Song[], startIndex=0) => {
        if(songs.length === 0) return;

        const song = songs[startIndex];

        set({
            queue: songs,
            currentSong: song,
            currentIndex: startIndex,
            isPlaying: true
        })
    },

    setCurrentSong: (song: Song | null) => {
        if(!song) return;

        const songIndex = get().queue.findIndex(s => s._id === song._id);
        set({
            currentSong: song,
            isPlaying: true,
            queue: songIndex !== -1 ? get().queue : [song],
            currentIndex: songIndex !== -1 ? songIndex : 0
        })
    },

    togglePlay: () => {
        const willStartPlaying = !get().isPlaying;

        set({
            isPlaying: willStartPlaying,
        })
    },

    playNext: () => {
        const { currentIndex, queue, isShuffleEnabled, repeatMode } = get();

        if(queue.length === 0) return;

        if(repeatMode === "one" && currentIndex >= 0) {
            set({ isPlaying: true });
            return;
        }

        const nextIndex = isShuffleEnabled
            ? getRandomIndex(queue.length, currentIndex)
            : currentIndex + 1;

        if(nextIndex < queue.length) {
            const nextSong = queue[nextIndex];

            set({
                currentSong: nextSong,
                currentIndex: nextIndex,
                isPlaying: true
            })
        } else if(repeatMode === "all") {
            set({
                currentSong: queue[0],
                currentIndex: 0,
                isPlaying: true,
            });
        } else {
            set({ isPlaying: false });
        }

    },

    playPrevious: () => {
        const { currentIndex, queue } = get();
        const prevIndex = currentIndex - 1;

        // there is previous song
        if(prevIndex >= 0) {
            const prevSong = queue[prevIndex];
            set({
                currentSong: prevSong,
                currentIndex: prevIndex,
                isPlaying: true
            })
        } else {
            // no previous song
            set({ isPlaying: false });
        }
    },

    toggleShuffle: () => {
        set((state) => ({
            isShuffleEnabled: !state.isShuffleEnabled,
        }));
    },

    cycleRepeatMode: () => {
        const repeatModes: RepeatMode[] = ["off", "all", "one"];
        const currentMode = get().repeatMode;
        const currentModeIndex = repeatModes.indexOf(currentMode);
        const nextMode = repeatModes[(currentModeIndex + 1) % repeatModes.length];

        set({
            repeatMode: nextMode,
        });
    },
}))
