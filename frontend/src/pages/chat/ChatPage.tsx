import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, MessageCircle } from 'lucide-react';
import { useChatStore } from '@/stores/useChatStore';
import { useAuthStore } from '@/stores/useAuthStore';
import UsersList from './components/UsersList';
import MessageInput from './components/MessageInput';
import { EmptyState } from '@/components/redesign/ProjectComponents';
function sharedProject(content:string){try{const url=new URL(content);return url.origin===window.location.origin&&/^\/projects\/[a-f\d]{24}$/i.test(url.pathname)?url.pathname+url.search:null;}catch{return null;}}
export default function ChatPage(){
 const {currentUser,isAuthenticated}=useAuthStore(),{messages,selectedUser,fetchMessages,onlineUsers,error,isConnected}=useChatStore();
 const end=useRef<HTMLDivElement>(null),selectedId=selectedUser?.authUserId;
 useEffect(()=>{if(selectedId)void fetchMessages(selectedId);},[selectedId,fetchMessages]);
 useEffect(()=>{end.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});},[messages.length,selectedUser?.authUserId]);
 if(!isAuthenticated)return <main><header className='r-page-heading'><h1>Messages</h1></header><EmptyState title='A conversation starts with a friend' description='Sign in to add friends, share projects, and chat about what you’re making.'><Link to='/login?redirect=/chat' className='r-button primary'>Sign in</Link></EmptyState></main>;
 return <main className='r-chat-page'><header className='r-page-heading'><h1>Messages</h1></header><div className='r-chat-layout'><UsersList/><section className='r-conversation'>{selectedUser?<><header className='r-conversation-header'><span className='r-friend-avatar'>{selectedUser.imageUrl?<img src={selectedUser.imageUrl} alt=''/>:<span>{selectedUser.fullName[0]}</span>}</span><div><h2>{selectedUser.fullName}</h2><span><i className={onlineUsers.has(selectedUser.authUserId)?'online':''}/>{onlineUsers.has(selectedUser.authUserId)?'Online':'Offline'}</span></div><span className='r-connection'>{isConnected?'Private conversation':'Reconnecting…'}</span></header><div className='r-messages' role='log' aria-label={`Conversation with ${selectedUser.fullName}`} aria-live='polite'>{!messages.length&&<div className='r-conversation-start'><MessageCircle size={23} strokeWidth={1.3}/><p>Start the conversation.</p><span>Share a song, an idea, or a quick hello.</span></div>}{messages.map(message=>{const own=message.senderId===currentUser?.authUserId,link=sharedProject(message.content);return <article key={message._id} className={`r-message ${own?'own':''}`}><span className='r-person'>{own?currentUser?.fullName[0]:selectedUser.fullName[0]}</span><div>{link?<Link to={link} className='r-shared-project'><span>SONG PROJECT</span><strong>Open shared project<ArrowUpRight size={15}/></strong><small>Access depends on the artist’s sharing settings.</small></Link>:<p>{message.content}</p>}<time>{new Date(message.createdAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</time></div></article>;})}<div ref={end}/></div>{error&&<p className='r-error' role='status'>{error}</p>}<MessageInput key={selectedUser.authUserId}/></>:<EmptyState title='No conversation selected' description='Choose a friend to start chatting.'/ >}</section></div></main>;
}
