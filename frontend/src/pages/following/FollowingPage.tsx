import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Music2 } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useAuthStore } from '@/stores/useAuthStore';
import { useChatStore } from '@/stores/useChatStore';
import { projectEvents, relativeTime } from '@/components/redesign/project-utils';
import { FeedEvent, EmptyState, ProjectSkeleton } from '@/components/redesign/ProjectComponents';
import { media } from '@/pages/studio/project';
import Artwork from '@/components/redesign/Artwork';
export default function FollowingPage(){
 const authenticated=useAuthStore(s=>s.isAuthenticated),{data,loading,error,reload}=useProjects('following');
 const {users,userActivities,onlineUsers,setSelectedUser}=useChatStore();const [tab,setTab]=useState('all');
 const events=projectEvents(data).filter(e=>tab==='all'||(tab==='versions'?e.kind==='version':e.kind==='post'));
 return <main><header className='r-page-heading'><h1>Following</h1></header><nav className='r-tabs' aria-label='Updates filter'>{[['all','All updates'],['versions','New versions'],['posts','Process notes']].map(([id,label])=><button key={id} className={tab===id?'selected':''} onClick={()=>setTab(id)}>{label}</button>)}</nav>{!authenticated?<EmptyState title='Stay close to the process' description='Sign in and follow a song to find its new versions and updates here.'><Link className='r-button primary' to='/login?redirect=/following'>Sign in</Link></EmptyState>:error?<EmptyState title='Couldn’t load updates' description={error}><button className='r-button' onClick={reload}>Try again</button></EmptyState>:loading?<ProjectSkeleton/>:<div className='r-discovery-columns'><section className='r-following-feed'>{events.length?events.map(e=><FeedEvent key={e.id} event={e}/>):<EmptyState title='Your feed is waiting' description='Follow a project from Discover to keep up with its process.'><Link className='r-button' to='/'>Explore projects</Link></EmptyState>}</section><aside className='r-activity'><h2>Projects you follow</h2><div className='r-followed-projects'>{data.map(p=><Link key={p._id} to={`/projects/${p._id}`}><Artwork src={media(p.coverUrl)}/><div><strong>{p.title}</strong><span>V{p.versions.length} · {relativeTime(p.updatedAt)}</span></div></Link>)}</div><div className='r-section-heading'><h2>Friends listening</h2></div>{users.length?users.map(user=><Link key={user.authUserId} className='r-listening-friend' to='/chat' onClick={()=>setSelectedUser(user)}><span className='r-person'>{user.fullName[0]}</span><div><strong>{user.fullName}</strong><span>{onlineUsers.has(user.authUserId)?(userActivities.get(user.authUserId)||'Idle').replace('Playing: ',''):'Offline'}</span></div>{onlineUsers.has(user.authUserId)&&<Music2 size={15}/>}</Link>):<p className='r-muted r-small'>Add friends in Messages to see what they’re listening to.</p>}</aside></div>}</main>;
}
