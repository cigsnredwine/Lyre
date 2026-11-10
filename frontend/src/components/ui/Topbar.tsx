import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, Bell, ChevronDown, UserRound, LogOut, Settings2 } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { authClient } from '@/lib/auth-client';
export default function Topbar() {
 const {currentUser,sessionUser,isAuthenticated,isAdmin,reset}=useAuthStore();
 const navigate=useNavigate();const [params]=useSearchParams();const query=params.get('q')||'';
 const [draft,setDraft]=useState<{query:string;value:string}|null>(null);
 const [open,setOpen]=useState(false);const menu=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!open)return;const close=(e:MouseEvent)=>{if(!menu.current?.contains(e.target as Node))setOpen(false);};const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};window.addEventListener('mousedown',close);window.addEventListener('keydown',escape);return()=>{window.removeEventListener('mousedown',close);window.removeEventListener('keydown',escape);};},[open]);
 const name=currentUser?.fullName||sessionUser?.name||'Your account';
 return <header className='r-topbar'><Link className='r-mobile-brand' to='/'>lyre</Link><form className='r-search' onSubmit={e=>{e.preventDefault();const value=(draft?.query===query?draft.value:query).trim();if(value)navigate(`/search?q=${encodeURIComponent(value)}`);}}><Search size={18}/><input aria-label='Search music and projects' placeholder='Search projects, artists, songs…' value={draft?.query===query?draft.value:query} onChange={e=>setDraft({query,value:e.target.value})}/><kbd>↵</kbd></form><div className='r-header-actions'>
 {isAuthenticated?<><Link to='/following' className='r-icon-button r-updates-link' aria-label='Updates from projects you follow'><Bell size={21}/></Link><div className='r-account' ref={menu}><button className='r-account-trigger' aria-label='Account options' aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{currentUser?.imageUrl?<img src={currentUser.imageUrl} alt=''/>:<span>{name[0]}</span>}<ChevronDown size={14}/></button>{open&&<div className='r-account-menu'><p>{name}<small>{sessionUser?.email}</small></p><Link to='/profile' onClick={()=>setOpen(false)}><UserRound size={15}/>Your profile</Link>{isAdmin&&<Link to='/admin' onClick={()=>setOpen(false)}><Settings2 size={15}/>Administration</Link>}<button onClick={async()=>{await authClient.signOut();reset();setOpen(false);}}><LogOut size={15}/>Sign out</button></div>}</div><Link className='r-button primary r-new-project' to='/studio?new=1'><Plus size={17}/><span>New project</span></Link></>:<><Link className='r-button quiet' to='/login'>Sign in</Link><Link className='r-button primary' to='/signup'>Join Lyre</Link></>}
 </div></header>;
}
