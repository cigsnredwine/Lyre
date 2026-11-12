import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Pencil, Play, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { axiosInstance } from '@/lib/axios';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import Artwork from '@/components/redesign/Artwork';
import { EmptyState, ProjectSkeleton } from '@/components/redesign/ProjectComponents';
import { projectsChanged } from '@/hooks/useProjects';
import { projectSong, stageLabel } from '@/components/redesign/project-utils';
import { media, stamp, type Project } from '@/pages/studio/project';
import type { Album, Song } from '@/types';
import './artist-profile.css';
import '@/pages/studio/studio.css';

type Artist = { isFollowing: boolean; followerCount: number; id: string; name: string; bio: string; website: string; photoUrl: string; tracks: Song[]; albums: Pick<Album, '_id' | 'title' | 'artist' | 'imageUrl' | 'releaseYear'>[] };

function artistPhoto(url: string) {
    if (!url.startsWith('/api/artists/')) return url;
    const base = (axiosInstance.defaults.baseURL || '/api').replace(/\/api\/?$/, '');
    return `${base}${url}`;
}

export default function ProfilePage() {
    const { artistId } = useParams();
    const ownId = useAuthStore(state => state.currentUser?.authUserId);
    const id = artistId || ownId;
    const isOwner = Boolean(id && id === ownId);
    const [result, setResult] = useState<{ id: string; artist?: Artist; projects: Project[]; error?: string }>();
    const [followingBusy, setFollowingBusy] = useState(false);
    const [editing, setEditing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [image, setImage] = useState<{ file: File; url: string }>();

    useEffect(() => {
        if (!id) return;
        const controller = new AbortController();
        const config = { signal: controller.signal };
        Promise.all([
            axiosInstance.get<Artist>(`/artists/${encodeURIComponent(id)}`, config),
            axiosInstance.get<Project[]>('/projects', { ...config, params: { scope: 'artist', artistId: id } }),
        ]).then(([artist, projects]) => {
            if (!controller.signal.aborted) setResult({ id, artist: artist.data, projects: projects.data });
        }).catch(error => {
            if (!controller.signal.aborted) setResult({ id, projects: [], error: error.response?.status === 404 ? 'Artist profile not found' : 'Couldn’t load this artist profile' });
        });
        return () => controller.abort();
    }, [id, ownId]);

    useEffect(() => () => { if (image) URL.revokeObjectURL(image.url); }, [image]);

    if (!id) return <Navigate to='/login?redirect=/profile' replace />;
    if (result?.id !== id) return <ProjectSkeleton />;
    if (!result.artist) return <EmptyState title={result.error || 'Artist profile not found'}><Link className='r-button' to='/'>Discover</Link></EmptyState>;
    const { artist, projects } = result;
    const photo = artistPhoto(artist.photoUrl);
    const firstSong = projects.map(project => {
        const version = project.versions.filter(v => v.isPublic).at(-1);
        return version ? projectSong(project, version) : null;
    }).find(Boolean) || artist.tracks[0];

    async function followArtist() {
        setFollowingBusy(true);
        try {
            const { data } = await axiosInstance.post(`/artists/${encodeURIComponent(id!)}/follow`, { follow: !artist!.isFollowing });
            setResult(previous => previous && previous.id === id && previous.artist ? { ...previous, artist: { ...previous.artist, ...data } } : previous);
            projectsChanged();
        } catch { toast.error('Couldn’t update artist following. Try again.'); }
        finally { setFollowingBusy(false); }
    }

    function closeEditor() {
        setEditing(false);
        setImage(undefined);
    }

    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        if (image) data.set('photo', image.file);
        setBusy(true);
        try {
            const { data: changes } = await axiosInstance.patch<Omit<Artist, 'tracks' | 'albums'>>('/artists/me', data);
            setResult(previous => previous && previous.id === id && previous.artist
                ? { ...previous, artist: { ...previous.artist, ...changes } } : previous);
            closeEditor();
            toast.success('Artist profile updated');
        } catch (error) {
            const message = axiosInstanceError(error);
            toast.error(message);
        } finally { setBusy(false); }
    }

    return <main className='artist-profile'>
        <Link className='artist-back' to='/'><ArrowLeft size={14} />Discover</Link>
        <section className='artist-hero'>
            {photo && <img key={photo} src={photo} alt='' onError={e => { e.currentTarget.hidden = true; }} />}
            <div className='artist-intro'>
                <h1>{artist.name}</h1>
            {(firstSong || id || artist.website) && <div className='artist-controls'>
                {firstSong && <button className='artist-play' aria-label={`Play ${artist.name}`} onClick={() => usePlayerStore.getState().setCurrentSong(firstSong)}><Play size={13} fill='currentColor' />Listen</button>}
                {!isOwner && (ownId ? <button className='artist-edit' aria-pressed={artist.isFollowing} disabled={followingBusy} onClick={() => void followArtist()}>{followingBusy ? 'Saving…' : artist.isFollowing ? 'Following' : 'Follow artist'}</button> : <Link className='artist-edit' to={`/login?redirect=${encodeURIComponent('/profile/' + id)}`}>Follow artist</Link>)}
                {isOwner && <>
                    <button className='artist-edit' onClick={() => setEditing(true)}><Pencil size={13} />Edit profile</button>
                    <Link className='artist-edit' to='/settings/account'><Settings2 size={13} />Account settings</Link>
                </>}
                {artist.website && <a className='artist-edit' href={artist.website} target='_blank' rel='noopener noreferrer'>Website<ArrowUpRight size={13} /></a>}
            </div>}
            </div>
        </section>
        <div className={`artist-content${artist.bio ? ' has-about' : ''}`}>
            <section>
                <div className='artist-section-heading'><h2>Uploads</h2></div>
                <div className='artist-upload-list'>
                    {projects.map(project => <Link className='artist-upload-row' key={project._id} to={`/projects/${project._id}`}>
                        <Artwork src={media(project.coverUrl)} />
                        <span className='artist-upload-name'><strong>{project.title}</strong><small>{project.artist}</small></span>
                        <small className='artist-stage'>{stageLabel(project.stage)}</small>
                    </Link>)}
                    {artist.albums.map(album => <Link className='artist-upload-row' key={album._id} to={`/albums/${album._id}`}>
                        <Artwork src={album.imageUrl} />
                        <span className='artist-upload-name'><strong>{album.title}</strong><small>{album.artist}</small></span>
                        <small className='artist-stage'>Album · {album.releaseYear}</small>
                    </Link>)}
                    {artist.tracks.map(track => <button className='artist-upload-row' key={track._id} aria-label={`Play ${track.title}`} onClick={() => usePlayerStore.getState().setCurrentSong(track)}>
                        <Artwork src={track.imageUrl} />
                        <span className='artist-upload-name'><strong>{track.title}</strong><small>{track.artist}</small></span>
                        <small>{stamp(track.duration)}</small>
                    </button>)}
                </div>
                {!projects.length && !artist.tracks.length && !artist.albums.length && <p className='artist-empty'>No public uploads yet.</p>}
            </section>
            {artist.bio && <section className='artist-secondary'>
                <div className='artist-section-heading'><h2>About</h2></div>
                <p className='artist-bio'>{artist.bio}</p>
            </section>}
        </div>
        <Dialog open={editing && isOwner} onOpenChange={open => { if (!open && !busy) closeEditor(); }}>
            <DialogContent className='studio-dialog sm:max-w-lg max-h-[90dvh] overflow-y-auto'>
                <DialogTitle>Edit artist profile</DialogTitle>
                {editing && isOwner && <form className='studio-form' onSubmit={save}>
                    {(image || photo) && <img className='artist-editor-preview' src={image?.url || photo} alt='Artist header preview' />}
                    <label>Header photo<input type='file' accept='.jpg,.jpeg,.png,.webp' onChange={event => {
                        const file = event.target.files?.[0];
                        setImage(file ? { file, url: URL.createObjectURL(file) } : undefined);
                    }} /></label>
                    <label>Artist name<input name='name' defaultValue={artist.name} maxLength={120} required /></label>
                    <label>Bio<textarea name='bio' defaultValue={artist.bio} maxLength={1200} /></label>
                    <label>Website<input name='website' type='url' defaultValue={artist.website} maxLength={500} placeholder='https://' /></label>
                    <button className='s-button primary' disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
                </form>}
            </DialogContent>
        </Dialog>
    </main>;
}

function axiosInstanceError(error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
        const response = error.response as { data?: { message?: string } } | undefined;
        if (response?.data?.message) return response.data.message;
    }
    return 'Couldn’t save the artist profile';
}
