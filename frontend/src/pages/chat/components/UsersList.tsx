import { useState } from 'react';
import { Search } from 'lucide-react';
import FriendManager from '@/components/ui/FriendManager';
import { useChatStore } from '@/stores/useChatStore';
export default function UsersList(){
 const {users,selectedUser,isLoading,setSelectedUser,onlineUsers,messageCache}=useChatStore(),[query,setQuery]=useState('');
 const filtered=users.filter(u=>u.fullName.toLowerCase().includes(query.toLowerCase()));
 return <aside className='r-conversations'><label className='r-friend-search'><Search size={15}/><input aria-label='Search friends' placeholder='Search friends…' value={query} onChange={e=>setQuery(e.target.value)}/></label><div className='r-chat-friends-action'><FriendManager/></div><p className='r-friends-only'>Only friends can message you.</p><div className='r-friend-list'>{isLoading&&!users.length?<div className='r-side-skeleton'/>:filtered.map(user=>{const last=messageCache[user.authUserId]?.at(-1);return <button key={user.authUserId} className={selectedUser?.authUserId===user.authUserId?'selected':''} onClick={()=>setSelectedUser(user)} aria-label={`Chat with ${user.fullName}`} aria-pressed={selectedUser?.authUserId===user.authUserId}><span className='r-friend-avatar'>{user.imageUrl?<img src={user.imageUrl} alt=''/>:<span>{user.fullName[0]}</span>}{onlineUsers.has(user.authUserId)&&<i/>}</span><div><strong>{user.fullName}</strong><span>{last?.content||'Start a conversation'}</span></div>{last&&<time>{new Date(last.createdAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</time>}</button>;})}{!isLoading&&!filtered.length&&<p className='r-no-friends'>{query?'No friends found.':'Add a friend to start a conversation.'}</p>}</div></aside>;
}
