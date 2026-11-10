import { useState } from 'react';
import { Plus, Send, X } from 'lucide-react';
import { useChatStore } from '@/stores/useChatStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useProjects } from '@/hooks/useProjects';
export default function MessageInput(){
 const [message,setMessage]=useState(''),[sending,setSending]=useState(false),[attach,setAttach]=useState(false);
 const user=useAuthStore(s=>s.currentUser),{selectedUser,sendMessage,isConnected}=useChatStore();
 const {data:projects}=useProjects('mine');
 async function send(e:React.FormEvent){e.preventDefault();if(!selectedUser||!user||!message.trim()||sending)return;const sentText=message;setSending(true);if(await sendMessage(selectedUser.authUserId,user.authUserId,sentText.trim()))setMessage(current=>current===sentText?'':current);setSending(false);}
 return <form className='r-message-composer' onSubmit={send}>{attach&&<div className='r-attach-project'><header><strong>Share a project</strong><button type='button' aria-label='Close project picker' onClick={()=>setAttach(false)}><X size={15}/></button></header>{projects.length?projects.map(p=><button type='button' key={p._id} onClick={()=>{setMessage(`${window.location.origin}/projects/${p._id}`);setAttach(false);}}>{p.title}<small>{p.visibility}</small></button>):<p>Create a song in My studio to share it here.</p>}<span>Private projects still require an invitation.</span></div>}<button className='r-attach-button' type='button' aria-label='Share a project' aria-expanded={attach} onClick={()=>setAttach(v=>!v)}><Plus size={18}/></button><input aria-label='Message' placeholder={`Message ${selectedUser?.fullName.split(' ')[0]||'your friend'}…`} value={message} maxLength={4000} onChange={e=>setMessage(e.target.value)} disabled={sending}/><button className='r-send-button' type='submit' aria-label='Send message' disabled={sending||!message.trim()||!isConnected}><Send size={17}/></button></form>;
}
