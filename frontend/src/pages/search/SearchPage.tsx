import { useProjects } from "@/hooks/useProjects";
import { ProjectCard } from "@/components/redesign/ProjectComponents";
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Topbar from "@/components/ui/Topbar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { axiosInstance } from "@/lib/axios";
import type { Song } from "@/types";
import SongsSection from "@/pages/home/components/SongsSection";

type SearchResponse = {
	songs: Song[];
	artists: string[];
};

const SearchPage = () => {
	const [searchParams] = useSearchParams();
	const query = searchParams.get("q")?.trim() || "";
    const publicProjects = useProjects('public');
    const myProjects = useProjects('mine');
    const collaborations = useProjects('invited');
    const matchingProjects = [...new Map([...publicProjects.data, ...myProjects.data, ...collaborations.data].map(project => [project._id, project])).values()].filter(project => `${project.title} ${project.artist} ${project.description}`.toLowerCase().includes(query.toLowerCase()));
	const [results, setResults] = useState<SearchResponse>({ songs: [], artists: [] });
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		const controller = new AbortController();
        const runSearch = async () => {
			if (!query) {
				setResults({ songs: [], artists: [] });
				return;
			}

			setIsLoading(true);
			setError("");

			try {
				const response = await axiosInstance.get("/songs/search", {
					params: { q: query },
                    signal: controller.signal,
				});
				if (!controller.signal.aborted) setResults(response.data);
			} catch (err: any) {
				if (!controller.signal.aborted) setError(err.response?.data?.message ?? "Search failed");
			} finally {
				if (!controller.signal.aborted) setIsLoading(false);
			}
		};

		runSearch();
        return () => controller.abort();
	}, [query]);

	return (
		<main className='lyre-page flex min-h-0 flex-col h-full overflow-hidden rounded-sm border border-white/8 bg-black/30 backdrop-blur-[6px] shadow-[0_14px_36px_rgba(0,0,0,0.12)]'>
			<Topbar />
			<ScrollArea className='min-h-0 flex-1'>
				<div className='p-4 sm:p-6'>
					<div className='mb-8'>
						<h1 className='text-2xl font-medium tracking-tight text-white sm:text-3xl'>Search</h1>
						<p className='mt-2 text-sm text-zinc-400'>
							{query ? `Results for "${query}"` : "Search for songs and artists."}
						</p>
					</div>

					{error ? <p className='mb-6 text-red-500'>{error}</p> : null}

					{!!query && results.artists.length > 0 && (
						<div className='mb-10'>
							<h2 className='mb-4 text-lg font-medium tracking-tight sm:text-xl'>Artists</h2>
							<div className='flex flex-wrap gap-3'>
								{results.artists.map((artist) => (
									<Link to={`/search?q=${encodeURIComponent(artist)}`}
										key={artist}
										className='rounded-full border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-200'
									>
										{artist}
									</Link>
								))}
							</div>
						</div>
					)}

					{!query && <div className="search-suggestions"><p>Explore the library</p><div><Link to="/browse/new-uploads">New uploads</Link><Link to="/browse/recently-updated">Recently updated</Link><Link to="/studio">Artist projects</Link></div></div>}
                    {query && matchingProjects.length > 0 && <section className="r-search-projects"><div className="r-section-heading"><h2>Projects</h2></div><div className="r-project-grid">{matchingProjects.map(project => <ProjectCard key={project._id} project={project}/>)}</div></section>}
                    {query ? (
						<SongsSection title="Songs" songs={results.songs} isLoading={isLoading} hideShowAll />
					) : null}
				</div>
			</ScrollArea>
		</main>
	);
};

export default SearchPage;
