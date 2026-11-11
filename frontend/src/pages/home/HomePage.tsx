import ArtistCredits from '@/components/redesign/ArtistCredits';
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Play, ChevronRight, ArrowUpRight } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { media } from '@/pages/studio/project';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useMusicStore } from '@/stores/useMusicStore';
import { projectEvents, projectSong } from '@/components/redesign/project-utils';
import { ProjectCard, ProjectSkeleton, EmptyState, ActivityFeed } from '@/components/redesign/ProjectComponents';
import Artwork from '@/components/redesign/Artwork';
export default function HomePage(){
 const [params,setParams]=useSearchParams();const tab=params.get('view')||'for-you';const [stage,setStage]=useState('all');
 const {data:projects,loading,error,reload}=useProjects('public');
 const {albums,fetchAlbums}=useMusicStore();
 useEffect(()=>{void fetchAlbums();},[fetchAlbums]);
 const events=projectEvents(projects),featured=projects.find(p=>p.versions.length&&p.stage!=='released')||projects[0];
 const progress=projects.filter(p=>p.stage!=='released'&&(stage==='all'||p.stage===stage));
 const releases=projects.filter(p=>p.stage==='released');
 return <main className='r-discover'><header className='r-page-heading'><h1>Discover</h1></header><nav className='r-tabs' aria-label='Discover views'>{[['for-you','For you'],['in-progress','In progress'],['new-releases','New releases']].map(([id,label])=><button key={id} aria-current={tab===id?'page':undefined} className={tab===id?'selected':''} onClick={()=>setParams(id==='for-you'?{}:{view:id})}>{label}</button>)}</nav>
 {error?<EmptyState title='Couldn’t load discovery' description={error}><button className='r-button' onClick={reload}>Try again</button></EmptyState>:loading?<ProjectSkeleton/>:<div className='r-discovery-columns'><div className='r-discovery-main'>
 {tab==='for-you'?<>{featured?<section className='r-feature'><div className='r-feature-photo'><Artwork key={featured._id} src={media(featured.coverUrl)} alt={`${featured.title} artwork`}/></div><div className='r-feature-copy'><span className='r-eyebrow'>A work in progress</span><h2>{featured.title}</h2><p className='r-feature-artist'><ArtistCredits project={featured}/></p><p className='r-feature-description'>{featured.description||'Follow a song from its first idea to its latest take.'}</p><div className='r-feature-actions'>{featured.versions.length>0&&<button className='r-button' onClick={()=>{const song=projectSong(featured);if(song)usePlayerStore.getState().setCurrentSong(song);}}><Play size={13} fill='currentColor'/>Listen to latest version</button>}<Link className='r-text-link' to={`/projects/${featured._id}`}>Open project<ChevronRight size={13}/></Link></div></div></section>:<EmptyState title='The studio is open' description='Public projects will appear as artists share them.'><Link className='r-button primary' to='/studio?new=1'>Start a song project</Link></EmptyState>}
 <div className='r-section-heading'><h2>Inside the process</h2><button className='r-text-link' onClick={()=>setParams({view:'in-progress'})}>Explore projects<ArrowUpRight size={13}/></button></div><div className='r-project-grid'>{projects.filter(p=>p.stage!=='released').slice(0,3).map(p=><ProjectCard key={p._id} project={p}/>)}</div>
 {albums.length>0&&<><div className='r-section-heading'><h2>From the library</h2><Link className='r-text-link' to='/browse/latest-albums'>View all<ArrowUpRight size={13}/></Link></div><div className='r-album-grid'>{albums.slice(0,4).map(a=><Link key={a._id} to={`/albums/${a._id}`}><Artwork src={a.imageUrl} alt={a.title}/><strong>{a.title}</strong><span>{a.artist}</span></Link>)}</div></>}
 </>:tab==='in-progress'?<><div className='r-section-heading top'><h2>Songs taking shape</h2><div className='r-filters'>{[['all','All stages'],['idea','Writing'],['demo','Demo'],['in-progress','In progress']].map(([id,label])=><button key={id} className={stage===id?'selected':''} onClick={()=>setStage(id)}>{label}</button>)}</div></div>{progress.length?<div className='r-project-grid progress-grid'>{progress.map(p=><ProjectCard key={p._id} project={p}/>)}</div>:<EmptyState title='No projects at this stage yet'/>}</>:<><div className='r-section-heading top'><div><h2>New releases</h2><p>The finished songs. The stories that got them here.</p></div></div>{releases.length?<div className='r-project-grid'>{releases.map(p=><ProjectCard key={p._id} project={p}/>)}</div>:<EmptyState title='Still in the making' description='Completed projects appear here when their artist marks them released.'/>}<div className='r-section-heading'><h2>Albums & EPs</h2><Link to='/browse/latest-albums' className='r-text-link'>Full library<ChevronRight size={13}/></Link></div><div className='r-album-grid'>{albums.map(a=><Link key={a._id} to={`/albums/${a._id}`}><Artwork src={a.imageUrl} alt={a.title}/><strong>{a.title}</strong><span>{a.artist} · {a.releaseYear}</span></Link>)}</div></>}
 </div><ActivityFeed events={tab==='in-progress'?events.filter(e=>e.kind==='version'):events} title={tab==='in-progress'?'Recently revised':tab==='new-releases'?'Release notes':'From the studio'}/></div>}
 </main>;
}
