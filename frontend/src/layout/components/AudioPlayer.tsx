import { usePlayerStore } from '@/stores/usePlayerStore';
import { useTransportStore } from '@/stores/useTransportStore';
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
export default function AudioPlayer() {
 const ref = useRef<HTMLAudioElement>(null);
 const volume = useTransportStore(s => s.volume);
 useEffect(() => {
  const audio = ref.current; if (!audio) return;
  let request = 0;
  const sync = () => {
   const { currentSong, isPlaying } = usePlayerStore.getState();
   const source = currentSong?.audioUrl;
   const attempt = ++request;
   if (!source) { audio.pause(); return; }
   if (audio.getAttribute('src') !== source) { audio.src = source; useTransportStore.setState({time:0,duration:0}); }
   if (isPlaying) {
    // A synchronous store subscriber keeps play() inside the tap's user gesture on iOS.
    void audio.play().catch(error => {
     if (attempt !== request || error.name === 'AbortError') return;
     usePlayerStore.setState({isPlaying:false});
     toast.error(error.name === 'NotAllowedError' ? 'Playback was blocked. Tap Play to try again.' : 'This audio could not be played. Try another version.');
    });
   } else audio.pause();
  };
  const unsubscribe = usePlayerStore.subscribe((state, previous) => {
   if (state.currentSong?.audioUrl !== previous.currentSong?.audioUrl || state.isPlaying !== previous.isPlaying) sync();
  });
  sync();
  return () => { ++request; unsubscribe(); audio.pause(); };
 }, []);
 useEffect(() => { if(ref.current) ref.current.volume = volume; }, [volume]);
 return <audio id='lyre-audio' ref={ref} crossOrigin='use-credentials' preload='auto'
  onTimeUpdate={e => useTransportStore.setState({time:e.currentTarget.currentTime})}
  onLoadedMetadata={e => useTransportStore.setState({duration:Number.isFinite(e.currentTarget.duration)?e.currentTarget.duration:0})}
  onPause={event => {
   const audio = event.currentTarget;
   const source = usePlayerStore.getState().currentSong?.audioUrl;
   // Ignore a queued pause event from the previous source while switching tracks.
   if (source && audio.currentSrc === new URL(source, document.baseURI).href && audio.paused && !audio.ended && audio.readyState >= 2 && !audio.seeking) usePlayerStore.setState({isPlaying:false});
  }}
  onError={() => { if (usePlayerStore.getState().isPlaying) { usePlayerStore.setState({isPlaying:false}); toast.error('This audio could not be loaded. Check your connection or try another version.'); } }}
  onEnded={() => { const state=usePlayerStore.getState(); if(state.repeatMode === 'one' && ref.current){ref.current.currentTime=0;void ref.current.play().catch(()=>usePlayerStore.setState({isPlaying:false}));} else state.playNext(); }}/ >;
}
