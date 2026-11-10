import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shuffle, SkipBack, SkipForward, Pause, Play, Repeat, ListMusic, X, Disc3 } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useTransportStore } from '@/stores/useTransportStore';
import { formatDuration } from '@/lib/utils';
import Waveform from '@/components/redesign/Waveform';
import Artwork from '@/components/redesign/Artwork';
export function PlaybackControls() {
 const { currentSong, isPlaying, togglePlay, playNext, playPrevious, toggleShuffle, cycleRepeatMode, isShuffleEnabled, repeatMode, queue, setCurrentSong } = usePlayerStore();
 const {time,duration,volume,seek,setVolume}=useTransportStore();
 const [showQueue,setShowQueue]=useState(false);
 return <footer className='r-dock' aria-label='Music player'>
  <div className='r-now-playing'><Artwork key={currentSong?.imageUrl} src={currentSong?.imageUrl}/><div>{currentSong?.projectId?<Link to={`/projects/${currentSong.projectId}`}>{currentSong.title}</Link>:<strong>{currentSong?.title || 'Nothing playing yet'}</strong>}<span>{currentSong?.artist || 'Find something to listen to'}</span></div></div>
  <div className='r-transport'><button className={isShuffleEnabled?'active':''} onClick={toggleShuffle} disabled={!currentSong} aria-label='Shuffle' aria-pressed={isShuffleEnabled}><Shuffle/></button><button onClick={playPrevious} disabled={!currentSong} aria-label='Previous track'><SkipBack/></button><button className='r-main-play' onClick={togglePlay} disabled={!currentSong} aria-label={isPlaying?'Pause':'Play'}>{isPlaying?<Pause fill='currentColor'/>:<Play fill='currentColor'/>}</button><button onClick={playNext} disabled={!currentSong} aria-label='Next track'><SkipForward/></button><button className={repeatMode!=='off'?'active':''} onClick={cycleRepeatMode} disabled={!currentSong} aria-label={`Repeat ${repeatMode}`}><Repeat/>{repeatMode==='one'&&<small>1</small>}</button></div>
  <div className='r-dock-wave'><span>{formatDuration(time)}</span><Waveform src={currentSong?.audioUrl} value={time} duration={duration} onSeek={seek}/><span>{formatDuration(duration || currentSong?.duration || 0)}</span></div>
  <VolumeControl value={volume} onChange={setVolume}/>
  <button className={`r-queue-toggle ${showQueue?'active':''}`} onClick={()=>setShowQueue(v=>!v)} aria-label='Playback queue' aria-expanded={showQueue}><ListMusic/></button>
  {showQueue&&<section className='r-queue'><header><h3>Player & queue</h3><button aria-label='Close queue' onClick={()=>setShowQueue(false)}><X size={17}/></button></header><section className='r-queue-volume'><span>Volume</span><VolumeControl value={volume} onChange={setVolume}/></section>{queue.length?queue.map(song=><button key={song._id} onClick={()=>setCurrentSong(song)} className={song._id===currentSong?._id?'selected':''}><Artwork src={song.imageUrl}/><span><strong>{song.title}</strong><small>{song.artist}</small></span>{song._id===currentSong?._id&&<Disc3 size={15}/>}</button>):<p>Your listening queue is empty.</p>}</section>}
 </footer>;
}

function VolumeControl({value,onChange}:{value:number;onChange:(value:number)=>void}){
 return <div className='r-volume'><output>{Math.round(value*100)}%</output><div className='r-volume-ladder' aria-hidden='true'>{Array.from({length:22},(_,i)=><i key={i} className={(i+.5)/22<=value?'filled':''} style={{height:`${15+i*3.8}%`}}/>)}</div><input type='range' aria-label='Volume' min={0} max={100} value={Math.round(value*100)} onChange={e=>onChange(Number(e.target.value)/100)}/></div>;
}
