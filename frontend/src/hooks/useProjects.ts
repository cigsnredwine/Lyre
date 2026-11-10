import { useEffect, useState, useCallback } from 'react';
import { axiosInstance } from '@/lib/axios';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Project } from '@/pages/studio/project';
export type ProjectScope = 'public' | 'mine' | 'invited' | 'following';
export const projectsChanged = () => window.dispatchEvent(new Event('lyre:projects'));
export function useProjects(scope: ProjectScope) {
 const account=useAuthStore(s=>s.currentUser?.authUserId),[revision,setRevision]=useState(0);
 const key=`${account||'guest'}:${scope}:${revision}`;
 const [result,setResult]=useState<{key:string;data:Project[];error:string}|null>(null);
 const reload=useCallback(()=>setRevision(v=>v+1),[]);
 useEffect(()=>{window.addEventListener('lyre:projects',reload);return()=>window.removeEventListener('lyre:projects',reload);},[reload]);
 useEffect(()=>{
  if(scope!=='public'&&!account)return;
  const controller=new AbortController();
  axiosInstance.get('/projects',{params:{scope,details:'true'},signal:controller.signal})
   .then(r=>{if(!controller.signal.aborted)setResult({key,data:r.data,error:''});})
   .catch(e=>{if(!controller.signal.aborted)setResult({key,data:[],error:e.response?.data?.message||'Unable to load projects. Please try again.'});});
  return()=>controller.abort();
 },[scope,account,key]);
 const allowed=scope==='public'||!!account,current=result?.key===key?result:null;
 return {data:allowed?current?.data||[]:[],loading:allowed&&!current,error:allowed?current?.error||'':'',reload};
}
