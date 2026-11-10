import { NavLink } from 'react-router-dom';
import { House, UsersRound, MessageCircle, NotebookPen } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
export default function MobileNavigation() {
  const authenticated = useAuthStore(state => state.isAuthenticated);
  return <nav className='mobile-navigation' aria-label='Main navigation'>
    {[{ to: '/', label: 'Discover', icon: House }, { to: '/following', label: 'Following', icon: UsersRound },
      ...(authenticated ? [{ to: '/chat', label: 'Messages', icon: MessageCircle }] : []),
      { to: '/studio', label: 'Studio', icon: NotebookPen }].map(({ to, label, icon: Icon }) =>
      <NavLink key={to} to={to} end={to === '/'}><Icon size={18} strokeWidth={1.6}/><span>{label}</span></NavLink>)}
  </nav>;
}
