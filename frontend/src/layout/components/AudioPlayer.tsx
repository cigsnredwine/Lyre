import { usePlayerStore } from '@/stores/usePlayerStore';
import { useTransportStore } from '@/stores/useTransportStore';
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
export default function AudioPlayer() {
 const ref = useRef<HTMLAudioElement>(null);
 const source = usePlayerStore(s => s.currentSong?.audioUrl);
 const playing = usePlayerStore(s => s.isPlaying);
 const volume = useTransportStore(s => s.volume);
 useEffect(() => {
  const audio = ref.current; if (!audio) return;
  let active = true;
  if (!source) { audio.pause(); return; }
  if (audio.getAttribute('src') !== source) { audio.src = source; useTransportStore.setState({time:0,duration:0}); }
  if (playing) audio.play().catch(error => { if (active && error.name !== 'AbortError') { usePlayerStore.setState({isPlaying:false}); if (error.name !== 'NotAllowedError') toast.error('This audio could not be played. Try another version.'); } }); else audio.pause();
  return () => { active = false; };
 }, [source, playing]);
 useEffect(() => { if(ref.current) ref.current.volume = volume; }, [volume]);
 return <audio id='lyre-audio' ref={ref} crossOrigin='use-credentials' preload='auto'
  onTimeUpdate={e => useTransportStore.setState({time:e.currentTarget.currentTime})}
  onLoadedMetadata={e => useTransportStore.setState({duration:Number.isFinite(e.currentTarget.duration)?e.currentTarget.duration:0})}
  onPause={event => { const audio=event.currentTarget; if(audio.paused && !audio.ended && audio.readyState>=2 && !audio.seeking) usePlayerStore.setState({isPlaying:false}); }}
  onEnded={() => { const state=usePlayerStore.getState(); if(state.repeatMode === 'one' && ref.current){ref.current.currentTime=0;void ref.current.play().catch(()=>usePlayerStore.setState({isPlaying:false}));} else state.playNext(); }}/ >;
}
