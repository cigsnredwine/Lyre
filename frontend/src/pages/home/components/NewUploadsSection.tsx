import { usePlayerStore } from "@/stores/usePlayerStore";
import LibraryEmpty from "@/components/ui/LibraryEmpty";
import NewUploadsSectionSkeleton from '@/components/ui/skeletons/NewUploadsSectionSkeleton';
import { useMusicStore } from '@/stores/useMusicStore'
import PlayButton from './PlayButton';

import { Link } from 'react-router-dom';

type NewUploadsSectionProps = {
    title?: string;
    showAllHref?: string;
}

const NewUploadsSection = ({ title = "New Uploads", showAllHref = "/browse/new-uploads" }: NewUploadsSectionProps) => {
    const {isLoading, newUploadSongs, error} = useMusicStore();

    const playSong = (song: import('@/types').Song) => {
        const player = usePlayerStore.getState();
        if (player.currentSong?._id === song._id) player.togglePlay(); else player.setCurrentSong(song);
    };
    if(isLoading) return <NewUploadsSectionSkeleton />

    if(error) return <p className="text-red-500 mb-4 text-lg">{error}</p>


  return (
    <div className="music-section mb-6 sm:mb-8">
        <div className="mb-3 flex items-center justify-between sm:mb-4">
            <h2 className="text-lg font-medium tracking-tight sm:text-2xl">{title}</h2>
            <Link to={showAllHref} className="section-link">Show all</Link>
        </div>
        {!newUploadSongs.length && <LibraryEmpty/>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {newUploadSongs.map((song) => (
                <div
                    key={song._id}
                    className="music-card group relative flex items-stretch overflow-hidden rounded-sm bg-zinc-800/45 transition-colors hover:bg-zinc-700/50"
                >
                    <img
                        loading="lazy" decoding="async" src={song.imageUrl}
                        alt={song.title}
                        className="h-14 w-14 shrink-0 object-cover sm:h-20 sm:w-20"
                    />
                    <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2.5 sm:px-4 sm:py-3">
                        <button className="song-title-button truncate text-sm font-medium" onClick={() => playSong(song)} aria-label={`Play ${song.title}`}>{song.title}</button>
                        <p className="truncate text-xs text-zinc-400">{song.artist}</p>
                    </div>

                    <PlayButton song={song} />
                </div>

            ))}
        </div>
    </div>
  )
}

export default NewUploadsSection
