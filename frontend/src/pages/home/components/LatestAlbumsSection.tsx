import LibraryEmpty from "@/components/ui/LibraryEmpty";
import type { Album } from "@/types";

import SongsSectionSkeleton from "@/components/ui/skeletons/SongsSectionSkeleton";
import { Link } from "react-router-dom";

type LatestAlbumsSectionProps = {
	title: string;
	albums: Album[];
	isLoading: boolean;
	showAllHref?: string;
	hideShowAll?: boolean;
	hideTitle?: boolean;
};

const LatestAlbumsSection = ({
	title,
	albums,
	isLoading,
	showAllHref,
	hideShowAll = false,
	hideTitle = false,
}: LatestAlbumsSectionProps) => {
	if (isLoading) return <SongsSectionSkeleton />;

	return (
		<div className='music-section mb-6 sm:mb-8'>
			{!hideTitle || (!hideShowAll && showAllHref) ? (
				<div className='mb-3 flex items-center justify-between sm:mb-4'>
					{!hideTitle ? <h2 className='text-lg font-medium tracking-tight sm:text-2xl'>{title}</h2> : <div />}
					{!hideShowAll && showAllHref ? (
						<Link to={showAllHref} className="section-link">Show all</Link>
					) : null}
				</div>
			) : null}

			{!albums.length && <LibraryEmpty title='No albums yet' description='Albums and EPs will appear here.'/>}
			<div className='grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4'>
				{albums.map((album) => (
					<Link
						to={`/albums/${album._id}`}
						key={album._id}
						className='music-card group rounded-sm bg-zinc-900/38 p-2.5 transition-colors hover:bg-zinc-800/70 sm:p-3'
					>
						<div className='mb-2.5 aspect-square overflow-hidden rounded-md shadow-lg sm:mb-3'>
							<img
								loading="lazy" decoding="async" src={album.imageUrl}
								alt={album.title}
								className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
							/>
						</div>
						<h3 className='mb-1 truncate text-base font-medium sm:mb-2'>{album.title}</h3>
						<p className='truncate text-xs text-zinc-400 sm:text-sm'>{album.artist}</p>
						<p className='mt-1 text-[11px] text-zinc-500 sm:text-xs'>
							{album.releaseYear} • {album.songs.length} songs
						</p>
					</Link>
				))}
			</div>
		</div>
	);
};

export default LatestAlbumsSection;
