import { Link } from 'react-router-dom';
import { Play, Pause, ChevronRight, LockKeyhole, Globe2, GitBranch, Music2 } from 'lucide-react';
import type { Project, Version } from '@/pages/studio/project';
import { media, stamp } from '@/pages/studio/project';
import { projectSong, relativeTime, stageLabel, type ProjectEvent } from './project-utils';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useTransportStore } from '@/stores/useTransportStore';
import Artwork from './Artwork';
import Waveform from './Waveform';
export function EmptyState({title,description,children}:{title:string;description?:string;children?:React.ReactNode}){return <div className='r-empty'><Music2 size={26} strokeWidth={1.3}/><h3>{title}</h3>{description&&<p>{description}</p>}{children}</div>;}
export function ProjectSkeleton(){return <div className='r-project-grid'>{[1,2,3].map(v=><div className='r-project-skeleton' key={v}/>)}</div>;}
export function MiniPlayer({project,version,share}:{project:Project;version?:Version;share?:string|null}){
 const song=projectSong(project,version,share),current=usePlayerStore(s=>s.currentSong),playing=usePlayerStore(s=>s.isPlaying);
 const time=useTransportStore(s=>s.time),seek=useTransportStore(s=>s.seek);
 if(!song)return <p className='r-muted r-small'>Audio is private.</p>;
 const selected=current?._id===song._id;
 return <div className='r-mini-player'><button aria-label={`${selected&&playing?'Pause':'Play'} ${project.title}`} onClick={()=>{const player=usePlayerStore.getState();if(selected)player.togglePlay();else player.setCurrentSong(song);}}>{selected&&playing?<Pause fill='currentColor' size={14}/>:<Play fill='currentColor' size={14}/>}</button><div><span className='r-mini-label'>{song.versionLabel}</span><Waveform compact src={song.audioUrl} value={selected?time:0} duration={song.duration} onSeek={selected?seek:undefined}/></div><span>{stamp(song.duration)}</span></div>;
}
export function ProjectCard({project:p,studio=false}:{project:Project;studio?:boolean}){
 return <article className={`r-project-card ${studio?'studio-card':''}`}><Link className='r-project-cover' to={`/projects/${p._id}`}><Artwork src={media(p.coverUrl)} alt={`${p.title} artwork`}/>{!studio&&<span className='r-stage'>{stageLabel(p.stage)}</span>}</Link><div className='r-project-card-body'><Link className='r-card-title' to={`/projects/${p._id}`}>{p.title}</Link>{studio?<><div className='r-card-status'><span className='r-stage'>{stageLabel(p.stage)}</span>{p.visibility==='public'?<Globe2 size={12}/>:<LockKeyhole size={12}/>}<span>{p.visibility}</span><span>·</span><span>V{p.versions.length}</span></div><p className='r-muted r-small'>Updated {relativeTime(p.updatedAt)}</p><div className='r-version-journey'>{p.versions.slice(-3).map((v,i,arr)=><div key={v._id} className={i===arr.length-1?'current':''}><i/><span>V{p.versions.length-arr.length+i+1}</span><small>{v.label}</small></div>)}</div><div className='r-card-footer'><Link to={`/projects/${p._id}`}>{p.versions.at(-1)?.label||'Project notes'}</Link><Link to={`/projects/${p._id}`} aria-label={`Open ${p.title}`}><ChevronRight size={15}/></Link></div></>:<div className='r-card-byline'><span>{p.artist}</span><small>V{p.versions.length} · {relativeTime(p.updatedAt)}</small></div>}</div></article>;
}
export function FeedEvent({event,compact=false}:{event:ProjectEvent;compact?:boolean}){
 const {project:p}=event;
 return <article className={`r-feed-event ${compact?'compact':''}`}><div className='r-feed-author'><span className='r-person'>{event.author?.[0]||'L'}</span><div><strong>{event.author}</strong><span>{event.kind==='version'?<> uploaded a new version of <Link to={`/projects/${p._id}`}>{p.title}</Link></>:event.kind==='post'?' · Process update':' · Feedback'}</span><small>{relativeTime(event.date)}</small></div></div><div className='r-feed-content'>{event.kind==='version'?<><h4><GitBranch size={13}/>{p.title} · {event.version?.label}</h4>{!compact&&event.body&&<p>{event.body}</p>}<MiniPlayer project={p} version={event.version}/></>:<><p>{event.timestamp!==undefined&&<Link className='r-time-chip' to={`/projects/${p._id}?tab=feedback&version=${event.version?._id}&at=${event.timestamp}`}><Play size={10}/>{stamp(event.timestamp)}</Link>}{event.body}</p>{event.image&&<Link to={`/projects/${p._id}`}><img src={media(event.image)} alt={`Process photo shared by ${event.author}`} loading='lazy'/></Link>}</>}{!compact&&<Link className='r-text-link' to={`/projects/${p._id}`}>View project <ChevronRight size={13}/></Link>}</div></article>;
}
export function ActivityFeed({events,title='From the studio'}:{events:ProjectEvent[];title?:string}){
 return <aside className='r-activity'><h2>{title}</h2>{events.length?events.slice(0,4).map(event=><FeedEvent key={event.id} event={event} compact/>):<div className='r-quiet-empty'><p>Every song starts somewhere.</p><span>Artist updates will appear here.</span></div>}</aside>;
}
