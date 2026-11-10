import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import LeftSidebar from './components/LeftSidebar';
import Topbar from '@/components/ui/Topbar';
import MobileNavigation from '@/components/ui/MobileNavigation';
import AudioPlayer from './components/AudioPlayer';
import { PlaybackControls } from './components/PlaybackControls';
import { useAuthStore } from '@/stores/useAuthStore';
import { useChatStore } from '@/stores/useChatStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
export default function MainLayout(){
 const userId=useAuthStore(s=>s.currentUser?.authUserId);
 const {initSocket,disconnectSocket,fetchUsers,socket,isConnected}=useChatStore();
 const song=usePlayerStore(s=>s.currentSong),playing=usePlayerStore(s=>s.isPlaying);
 const location=useLocation(),scroll=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!userId){disconnectSocket();return;}initSocket(userId);void fetchUsers();return disconnectSocket;},[userId,initSocket,disconnectSocket,fetchUsers]);
 useEffect(()=>{if(isConnected)socket.emit('update_activity',{activity:playing&&song?`Playing: ${song.title} - ${song.artist}`:'Idle'});},[song,playing,isConnected,socket]);
 useEffect(()=>{scroll.current?.scrollTo({top:0});},[location.pathname]);
 return <div className='r-app'><AudioPlayer/><LeftSidebar/><div className='r-workspace'><Topbar/><div className='r-content' ref={scroll}><div className='r-route' key={location.pathname}><Outlet/></div></div></div><PlaybackControls/><MobileNavigation/></div>;
}
