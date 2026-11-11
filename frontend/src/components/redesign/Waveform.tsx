import { useEffect, useRef, useState } from 'react';
const cache = new Map<string, Promise<number[]>>();
function peaks(src: string) {
 if (cache.has(src)) return cache.get(src)!;
 if (cache.size > 12) cache.delete(cache.keys().next().value!);
 const promise = (async () => {
  const response = await fetch(src, { credentials: 'include' });
  if (!response.ok) throw Error('Audio unavailable');
  const buffer = await response.arrayBuffer();
  const context = new AudioContext();
  try {
   const decoded = await context.decodeAudioData(buffer), channel = decoded.getChannelData(0), block = Math.max(1, Math.floor(channel.length / 100));
   const values = Array.from({ length: 100 }, (_, i) => { let sum = 0, n = 0; for (let j = i * block; j < Math.min((i + 1) * block, channel.length); j += 32) { sum += channel[j] ** 2; n++; } return Math.sqrt(sum / Math.max(1,n)); });
   const max = Math.max(...values, .001); return values.map(v => Math.max(.08, v / max));
  } finally { await context.close(); }
 })().catch(error => { cache.delete(src); throw error; });
 cache.set(src, promise); return promise;
}
export default function Waveform({ src, value = 0, duration = 0, onSeek, label = 'Playback position', compact = false }: { src?: string; value?: number; duration?: number; onSeek?: (seconds: number) => void; label?: string; compact?: boolean }) {
 const root = useRef<HTMLDivElement>(null);
 const dragging = useRef(false);
 const [preview, setPreview] = useState<{ src?: string; time: number } | null>(null);
 const position = preview?.src === src && preview ? preview.time : value;
 const finishSeek = (input: HTMLInputElement, commit: boolean) => {
  if (!dragging.current) return;
  dragging.current = false;
  if (commit) onSeek?.(Number(input.value));
  setPreview(null);
 };
 const [barCount,setBarCount]=useState(16);
 useEffect(()=>{if(!root.current)return;const observer=new ResizeObserver(entries=>{const width=entries[0]?.contentRect.width||0;setBarCount(Math.max(8,Math.min(100,Math.floor(width/4))));});observer.observe(root.current);return()=>observer.disconnect();},[]);
 const [wave, setWave] = useState<{ src: string; values: number[] } | null>(null);
 useEffect(() => {
  if (!src || !root.current) return;
  let active = true;
  const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { observer.disconnect(); peaks(src).then(values => { if (active) setWave({ src, values }); }).catch(() => {}); } }, { rootMargin: '80px' });
  observer.observe(root.current); return () => { active = false; observer.disconnect(); };
 }, [src]);
 const progress = duration > 0 ? Math.min(1,position / duration) : 0;
 const original = wave && wave.src === src ? wave.values : Array(100).fill(.09);
 const values = Array.from({length:barCount},(_,i)=>{const start=Math.floor(i*original.length/barCount),end=Math.max(start+1,Math.floor((i+1)*original.length/barCount));return Math.max(...original.slice(start,end));});
 return <div ref={root} className={`r-waveform ${compact ? 'compact' : ''} ${onSeek ? 'interactive' : ''}`}>
  <div className='r-wave-bars' aria-hidden='true'>{values.map((h,i) => <i key={i} className={i / values.length < progress ? 'played' : ''} style={{ height: `${h * 100}%` }}/>)}</div>
  {onSeek && <><span className='r-playhead' aria-hidden='true' style={{ left: `${progress * 100}%` }}/><input type='range' aria-label={label} min={0} max={duration || 1} step={.1} value={Math.min(position,duration || 0)} disabled={!src || !duration}
   onPointerDown={e => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); }}
   onChange={e => { const time = Number(e.target.value); if (dragging.current) setPreview({ src, time }); else onSeek(time); }}
   onPointerUp={e => finishSeek(e.currentTarget, true)}
   onPointerCancel={e => finishSeek(e.currentTarget, false)}
   onLostPointerCapture={e => finishSeek(e.currentTarget, false)}
   onBlur={e => finishSeek(e.currentTarget, true)}/></>}
 </div>;
}
