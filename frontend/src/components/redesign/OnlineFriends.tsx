import { Link } from 'react-router-dom';
import { Headphones, Users } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useChatStore } from '@/stores/useChatStore';

export default function OnlineFriends() {
 const authenticated = useAuthStore(s => s.isAuthenticated);
 const { users, onlineUsers, userActivities, listeningProjects, isConnected, isLoading, error, fetchUsers, setSelectedUser } = useChatStore();
 const friends = isConnected ? users.filter(user => onlineUsers.has(user.authUserId)) : [];
 return <aside className='r-activity r-online-friends' aria-label='Friends activity'>
  <header><h2>Friends online</h2>{authenticated && isConnected && <span>{friends.length}</span>}</header>
  {!authenticated ? <div className='r-quiet-empty'><Users size={22} strokeWidth={1.3}/><p>A little company.</p><span>Sign in to see friends and what they’re listening to.</span><Link to='/login?redirect=/'>Sign in</Link></div>
   : error ? <div className='r-quiet-empty'><p>Friends are unavailable.</p><button className='r-text-link' onClick={() => void fetchUsers()}>Try again</button></div>
   : !isConnected || isLoading ? <p className='r-muted r-small' role='status'>{isConnected ? 'Loading friends…' : 'Connecting…'}</p>
   : friends.length ? <ul className='r-online-list'>{friends.map(user => {
    const activity = userActivities.get(user.authUserId) || 'Idle';
    const playing = activity?.startsWith('Playing: ');
    const details = playing ? activity.slice(9) : '';
    const separator = details.lastIndexOf(' - ');
    const title = separator >= 0 ? details.slice(0, separator) : details;
    const artist = separator >= 0 ? details.slice(separator + 3) : '';
    const projectId = listeningProjects.get(user.authUserId);
    return <li key={user.authUserId}>
     <Link to='/chat' onClick={() => setSelectedUser(user)} className='r-online-avatar' aria-label={`Message ${user.fullName}`}><span className='r-friend-avatar'>{user.imageUrl ? <img src={user.imageUrl} alt=''/> : <span>{user.fullName[0]}</span>}<i/></span></Link>
     <div className='r-online-details'><strong>{user.fullName}</strong>{playing ? <><div className='r-online-track'><Headphones size={12}/>{projectId ? <Link to={`/projects/${projectId}`} title={title}>{title}</Link> : <span title={title}>{title}</span>}</div>{artist && <small title={artist}>{artist}</small>}</> : <span className='r-online-status'>Online</span>}</div>
    </li>;
   })}</ul> : <div className='r-quiet-empty'><Users size={22} strokeWidth={1.3}/><p>{users.length ? 'Quiet for now.' : 'Listen together.'}</p><span>{users.length ? 'Your friends will appear here when they come online.' : 'Add friends to see what they’re listening to.'}</span></div>}
  {authenticated && <Link className='r-online-manage' to='/chat'>Find your friends <span aria-hidden='true'>↗</span></Link>}
 </aside>;
}
