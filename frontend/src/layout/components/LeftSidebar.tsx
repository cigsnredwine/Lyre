import { Link, NavLink } from 'react-router-dom';
import { House, AudioLines, UsersRound, MessageCircle, Plus, ArrowUpRight } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useAuthStore } from '@/stores/useAuthStore';
import { media } from '@/pages/studio/project';
import { stageLabel } from '@/components/redesign/project-utils';
import Artwork from '@/components/redesign/Artwork';
export default function LeftSidebar(){
 const {data,loading}=useProjects('mine');const authenticated=useAuthStore(s=>s.isAuthenticated);
 return <aside className='r-sidebar'><Link to='/' className='r-wordmark' aria-label='Lyre home'>lyre</Link><nav aria-label='Main navigation'>{[{to:'/',label:'Discover',icon:House},{to:'/studio',label:'My studio',icon:AudioLines},{to:'/following',label:'Following',icon:UsersRound},{to:'/chat',label:'Messages',icon:MessageCircle}].map(({to,label,icon:Icon})=><NavLink end={to==='/'} key={to} to={to} aria-label={label} title={label} className={({isActive})=>isActive?'selected':''}><Icon size={19} strokeWidth={1.6}/><span>{label}</span></NavLink>)}</nav><div className='r-sidebar-project-heading'><span>Your projects</span><Link to='/studio?new=1' aria-label='New project'><Plus size={17}/></Link></div><div className='r-sidebar-projects'>{loading?<div className='r-side-skeleton'/>:data.slice(0,8).map(p=><NavLink key={p._id} to={`/projects/${p._id}`} aria-label={p.title} title={p.title}><Artwork src={media(p.coverUrl)}/><span><strong>{p.title}</strong><small>V{p.versions.length} · {stageLabel(p.stage)}</small></span></NavLink>)}{!loading&&!data.length&&<div className='r-sidebar-empty'><p>{authenticated?'A new song starts here.':'A home for your unfinished songs.'}</p><Link to={authenticated?'/studio?new=1':'/login'}>{authenticated?'Start a project':'Sign in to your studio'}<ArrowUpRight size={12}/></Link></div>}</div><div className='r-sidebar-footer'><span>Made, then remade.</span><Link to='/browse/latest-albums'>Browse the library<ArrowUpRight size={11}/></Link></div></aside>;
}
