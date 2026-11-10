import { useEffect, useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Topbar from "@/components/ui/Topbar";
import { useParams, Link } from "react-router-dom";
import { axiosInstance } from "@/lib/axios";
import type { Album, Song } from "@/types";
import SongsSection from "@/pages/home/components/SongsSection";
import LatestAlbumsSection from "@/pages/home/components/LatestAlbumsSection";

const sectionConfig = {
	"new-uploads": {
		title: "New Uploads",
		type: "songs" as const,
		endpoint: "/songs/latest",
	},
	"recently-updated": {
		title: "Recently Updated",
		type: "songs" as const,
		endpoint: "/songs/recently-updated",
	},
	"latest-albums": {
		title: "Latest Albums & EPs",
		type: "albums" as const,
		endpoint: "/albums",
	},
};

const BrowsePage = () => {
	const { sectionId } = useParams();
	const config = useMemo(
		() => (sectionId ? sectionConfig[sectionId as keyof typeof sectionConfig] : undefined),
		[sectionId]
	);
	const [songs, setSongs] = useState<Song[]>([]);
	const [albums, setAlbums] = useState<Album[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		const fetchSection = async () => {
			if (!config) return;

			setIsLoading(true);
			setError("");

			try {
				const response = await axiosInstance.get(config.endpoint);
				if (config.type === "songs") {
					setSongs(response.data);
					setAlbums([]);
				} else {
					setAlbums(response.data);
					setSongs([]);
				}
			} catch (err: any) {
				setError(err.response?.data?.message ?? "Failed to load this section");
			} finally {
				setIsLoading(false);
			}
		};

		fetchSection();
	}, [config]);

	if (!config) {
		return <main className="lyre-page h-full"><Topbar/><div className="library-empty m-6"><p>Collection not found</p><Link className="section-link" to="/">Back to home</Link></div></main>;
	}

	return (
		<main className='lyre-page flex min-h-0 flex-col h-full overflow-hidden rounded-sm border border-white/8 bg-black/30 backdrop-blur-[6px] shadow-[0_14px_36px_rgba(0,0,0,0.12)]'>
			<Topbar />
			<ScrollArea className='min-h-0 flex-1'>
				<div className='p-3 sm:p-6'>
					<div className='mb-6 sm:mb-8'>
						<h1 className='text-2xl font-medium tracking-tight text-white sm:text-3xl'>{config.title}</h1>
						<p className='mt-2 text-sm text-zinc-400'>
							Explore the full collection for this section.
						</p>
					</div>

					{error ? <p className='text-red-500'>{error}</p> : null}

					{config.type === "songs" ? (
						<SongsSection
							title={config.title}
							songs={songs}
							isLoading={isLoading}
							hideShowAll
							hideTitle
						/>
					) : (
						<LatestAlbumsSection
							title={config.title}
							albums={albums}
							isLoading={isLoading}
							hideShowAll
							hideTitle
						/>
					)}
				</div>
			</ScrollArea>
		</main>
	);
};

export default BrowsePage;
