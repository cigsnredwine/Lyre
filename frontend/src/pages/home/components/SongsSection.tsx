import { usePlayerStore } from "@/stores/usePlayerStore";
import LibraryEmpty from "@/components/ui/LibraryEmpty";
import type { Song } from "@/types";
import SongsSectionSkeleton from "@/components/ui/skeletons/SongsSectionSkeleton";

import PlayButton from "./PlayButton";
import { Link } from "react-router-dom";

type SongsSectionProps = {
    title:string,
    songs:Song[],
    isLoading:boolean;
    showAllHref?: string;
    hideShowAll?: boolean;
    hideTitle?: boolean;
}

const SongsSection = ({ title, songs, isLoading, showAllHref, hideShowAll = false, hideTitle = false }: SongsSectionProps) => {
    const playSong = (song: import('@/types').Song) => {
        const player = usePlayerStore.getState();
        if (player.currentSong?._id === song._id) player.togglePlay(); else player.setCurrentSong(song);
    };
    if (isLoading) return <SongsSectionSkeleton />
  return (
    <div className="music-section mb-6 sm:mb-8">
        {!hideTitle || (!hideShowAll && showAllHref) ? (
            <div className="mb-3 flex items-center justify-between sm:mb-4">
                {!hideTitle ? <h2 className="text-lg font-medium tracking-tight sm:text-2xl">{title}</h2> : <div />}
                {!hideShowAll && showAllHref ? (
                    <Link to={showAllHref} className="section-link">Show all</Link>
                ) : null}
            </div>
        ) : null}

        {!songs.length && <LibraryEmpty/>}
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4'>
            {songs.map((song) => (
                <div
                    key={song._id}
                    className='music-card group rounded-sm bg-zinc-900/38 p-2.5 transition-colors hover:bg-zinc-800/70 sm:p-3'
                >
                    <div className='relative mb-2.5 sm:mb-3'>
                        <div className='aspect-square overflow-hidden rounded-md shadow-lg'>
                            <img loading="lazy" decoding="async" src={song.imageUrl} alt={song.title}
                            className='w-full h-full object-cover transition-transform duration-300 group-hover:scale-105' />
                        </div>
                        <PlayButton song={song} />
                    </div>
                    <h3 className='mb-1 truncate text-base font-medium sm:mb-2'>
                        <button className="song-title-button" onClick={() => playSong(song)} aria-label={`Play ${song.title}`}>{song.title}</button>
                    </h3>
                        <p className='truncate text-xs text-zinc-400 sm:text-sm'>{song.artist}</p>
                    
                </div>
            ))}
        </div>
    </div>
  )
}

export default SongsSection
