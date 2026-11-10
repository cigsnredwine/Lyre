import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { axiosInstance } from '@/lib/axios';
import { useChatStore } from '@/stores/useChatStore';
import type { User } from '@/types';
import toast from 'react-hot-toast';
import { Check, Plus, Search, UserPlus, X } from 'lucide-react';
type Request = { _id: string; incoming: boolean; user: User };
type Result = User & { relationship: 'none' | 'friends' | 'sent' | 'incoming' };
export default function FriendManager() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Result[]>([]);
    const [requests, setRequests] = useState<Request[]>([]);
    const [busy, setBusy] = useState(false);
    const [searching, setSearching] = useState(false);
    const [revision, setRevision] = useState(0);
    const { socket, fetchUsers } = useChatStore();
    useEffect(() => {
        let active = true;
        const load = () => { axiosInstance.get('/users/requests').then(r => { if (active) { setRequests(r.data); setRevision(v => v + 1); } }).catch(() => {}); };
        load(); socket.on('friends_changed', load); socket.on('connect', load);
        return () => { active = false; socket.off('friends_changed', load); socket.off('connect', load); };
    }, [socket]);
    useEffect(() => {
        let active = true;
        setResults([]);
        if (query.trim().length < 2) { setSearching(false); return; }
        setSearching(true);
        const timer = setTimeout(() => {
            axiosInstance.get('/users/search', { params: { q: query.trim() } }).then(r => { if (active) setResults(r.data); }).catch(() => { if (active) toast.error('Unable to search users'); }).finally(() => { if (active) setSearching(false); });
        }, 300);
        return () => { active = false; clearTimeout(timer); };
    }, [query, revision]);
    const act = async (path: string, action?: string) => {
        setBusy(true);
        try {
            if (action) await axiosInstance.patch(path, { action }); else await axiosInstance.post(path);
            setRequests((await axiosInstance.get('/users/requests')).data);
            setRevision(v => v + 1); await fetchUsers();
        } catch (e: any) { toast.error(e.response?.data?.message || 'Unable to update request'); }
        finally { setBusy(false); }
    };
    const incoming = requests.filter(r => r.incoming);
    return <>
        <Button variant='ghost' size='sm' onClick={() => setOpen(true)} title='Add friends and view requests' aria-label={`Add friends${incoming.length ? `, ${incoming.length} requests` : ''}`}>
            <UserPlus className='size-4' /><span className='hidden lg:inline'>Add friends</span>{incoming.length > 0 && <span className='rounded-full bg-primary px-1.5 text-primary-foreground'>{incoming.length}</span>}
        </Button>
        <Dialog open={open} onOpenChange={setOpen}><DialogContent aria-describedby={undefined} className='sm:max-w-sm max-h-[85vh] overflow-y-auto gap-5 rounded-sm'>
            <DialogTitle>Friends</DialogTitle>
            {incoming.length > 0 && <section className='space-y-2'><h3 className='text-[10px] uppercase tracking-[0.16em] text-zinc-500'>Requests · {incoming.length}</h3>
                {incoming.map(r => <div key={r._id} className='flex items-center gap-2 border-b border-white/8 py-2 text-sm'><span className='flex-1'>{r.user.fullName}</span><Button variant='ghost' size='icon' title='Accept' aria-label={`Accept ${r.user.fullName}`} disabled={busy} onClick={() => act(`/users/requests/${r._id}`, 'accept')}><Check className='size-4' /></Button><Button variant='ghost' size='icon' title='Decline' aria-label={`Decline ${r.user.fullName}`} disabled={busy} onClick={() => act(`/users/requests/${r._id}`, 'decline')}><X className='size-4' /></Button></div>)}
            </section>}
            <label className='relative block'><span className='sr-only'>Search friends by name or exact email</span><Search aria-hidden='true' className='pointer-events-none absolute left-0 top-1/2 size-4 -translate-y-1/2 text-zinc-500' /><Input className='rounded-none border-0 border-b border-white/15 bg-transparent pl-7 shadow-none' value={query} onChange={e => setQuery(e.target.value)} placeholder='Name or email' /></label>
            <div aria-live='polite' className='space-y-2 text-sm empty:hidden'>
                {searching ? <p>Searching…</p> : query.trim().length >= 2 && !results.length ? <p className='text-zinc-400'>No users found.</p> : null}
                {results.map(u => <div key={u.authUserId} className='flex items-center gap-3 border-b border-white/8 py-2 text-sm'><span className='flex-1'>{u.fullName}</span>{u.relationship === 'none' ? <Button variant='ghost' size='icon' title='Add friend' aria-label={`Add ${u.fullName}`} disabled={busy} onClick={() => act(`/users/requests/${u.authUserId}`)}><Plus className='size-4' /></Button> : <span className='text-sm text-zinc-400'>{{ friends: 'Friends', sent: 'Sent', incoming: 'Pending' }[u.relationship]}</span>}</div>)}
            </div>
            {requests.some(r => !r.incoming) && <section className='space-y-2'><h3 className='text-[10px] uppercase tracking-[0.16em] text-zinc-500'>Sent</h3>{requests.filter(r => !r.incoming).map(r => <div key={r._id} className='flex items-center gap-2 py-1 text-sm'><span className='flex-1'>{r.user.fullName}</span><Button variant='ghost' size='icon' title='Cancel request' aria-label={`Cancel request to ${r.user.fullName}`} disabled={busy} onClick={() => act(`/users/requests/${r._id}`, 'cancel')}><X className='size-4' /></Button></div>)}</section>}
        </DialogContent></Dialog>
    </>;
}
