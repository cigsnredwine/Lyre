import { create } from 'zustand';
export const useTransportStore = create<{
 time: number; duration: number; volume: number; seek: (seconds: number) => void; setVolume: (volume: number) => void;
}>((set) => ({
 time: 0, duration: 0, volume: .65,
 seek: seconds => { const audio = document.getElementById('lyre-audio') as HTMLAudioElement | null; if (audio && Number.isFinite(audio.duration)) { audio.currentTime = Math.max(0, Math.min(seconds, audio.duration)); set({ time: audio.currentTime }); } },
 setVolume: volume => { const next = Math.max(0, Math.min(1, volume)); set({ volume: next }); const audio = document.getElementById('lyre-audio') as HTMLAudioElement | null; if (audio) audio.volume = next; },
}));
