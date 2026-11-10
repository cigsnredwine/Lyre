import { formatDuration } from "@/lib/utils";
import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { useMusicStore } from "@/stores/useMusicStore"
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Clock, Pause, Play } from "lucide-react";
import { usePlayerStore } from "@/stores/usePlayerStore";




const fallbackGradientStyle: React.CSSProperties = {
    backgroundImage: "linear-gradient(to bottom, rgb(55 147 166 / 0.82), rgb(24 24 27 / 0.82) 52%, rgb(24 24 27) 100%)",
};

const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const toRgb = (red: number, green: number, blue: number, alpha = 1) =>
    `rgb(${clampChannel(red)} ${clampChannel(green)} ${clampChannel(blue)} / ${alpha})`;

const SongInfoPage = () => {
   const { albumId } = useParams();
   const { fetchAlbumById, currentAlbum, isLoading } = useMusicStore();
   const {currentSong, isPlaying, playAlbum, togglePlay} = usePlayerStore();
   const [gradientStyle, setGradientStyle] = useState<React.CSSProperties>(fallbackGradientStyle);

   useEffect(() => {
      if(albumId) fetchAlbumById(albumId);
   }, [fetchAlbumById, albumId])

   useEffect(() => {
    if (!currentAlbum?.imageUrl) {
        setGradientStyle(fallbackGradientStyle);
        return;
    }

    let isCancelled = false;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = currentAlbum.imageUrl;

    image.onload = () => {
        try {
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d", { willReadFrequently: true });

            if (!context) {
                throw new Error("Canvas not available");
            }

            const sampleSize = 24;
            canvas.width = sampleSize;
            canvas.height = sampleSize;
            context.drawImage(image, 0, 0, sampleSize, sampleSize);

            const { data } = context.getImageData(0, 0, sampleSize, sampleSize);

            let redTotal = 0;
            let greenTotal = 0;
            let blueTotal = 0;
            let pixelCount = 0;

            for (let index = 0; index < data.length; index += 4) {
                const alpha = data[index + 3];

                if (alpha < 128) continue;

                redTotal += data[index];
                greenTotal += data[index + 1];
                blueTotal += data[index + 2];
                pixelCount += 1;
            }

            if (!pixelCount) {
                throw new Error("No pixels sampled");
            }

            const red = redTotal / pixelCount;
            const green = greenTotal / pixelCount;
            const blue = blueTotal / pixelCount;

            const vividTop = toRgb(red * 1.06, green * 1.04, blue * 1.08, 0.88);
            const mutedMiddle = toRgb(red * 0.5, green * 0.52, blue * 0.56, 0.8);
            const deepBottom = toRgb(red * 0.12, green * 0.13, blue * 0.15, 1);

            if (!isCancelled) {
                setGradientStyle({
                    backgroundImage: `linear-gradient(to bottom, ${vividTop} 0%, ${mutedMiddle} 46%, ${deepBottom} 100%)`,
                });
            }
        } catch {
            if (!isCancelled) {
                setGradientStyle(fallbackGradientStyle);
            }
        }
    };

    image.onerror = () => {
        if (!isCancelled) {
            setGradientStyle(fallbackGradientStyle);
        }
    };

    return () => {
        isCancelled = true;
    };
   }, [currentAlbum?.imageUrl]);

   if(isLoading || !currentAlbum) return null

   const handlePlayAlbum = () => {
    if(!currentAlbum) return;

    const isCurrentAlbumPlaying = currentAlbum?.songs.some(song => song._id === currentSong?._id);
    if(isCurrentAlbumPlaying) togglePlay();
    else {
        // start playing album from beginning
        playAlbum(currentAlbum.songs, 0); 
    }
   }

   const handlePlaySong = (index: number) => {
    if (!currentAlbum) return;
    playAlbum(currentAlbum?.songs, index)
   }
   
  return (
    <div className='h-full overflow-hidden rounded-xl border border-white/8 bg-black/30 backdrop-blur-[6px] shadow-[0_14px_36px_rgba(0,0,0,0.12)]'>
        <ScrollArea className='h-full'>
            {/* Main content */}
            <div className='relative min-h-full'>
                {/* bg gradient */}
                <div
                className='pointer-events-none absolute inset-0'
                style={gradientStyle}
                aria-hidden='true'
                />

                {/* Content */}
                <div className='relative z-10'>
                    <div className='flex p-6 gap-6 pb-8'>
                        <img src={currentAlbum.imageUrl} alt={currentAlbum.title}
                        className='w-60 h-60 shadow-xl rounded object-cover'
                        />
                        <div className="flex flex-col justify-end">
                            <p className='text-sm font-medium'>
                                Album
                            </p>
                            <h1 className='text-7xl font-bold my-4'>
                                {currentAlbum.title}
                            </h1>
                            <div className="flex items-center gap-2 text-sm text-zinc-100">   
                                <span className="font-medium text-white">{currentAlbum.artist}</span>
                                <span>• {currentAlbum.songs.length} songs</span>
                                <span>• {currentAlbum.releaseYear}</span>
                            </div>
                        </div>
                    </div>

                    {/* play button */}
                    <div className='px-6 pb-4 flex items-center gap-6'>
                        <Button
                        onClick={handlePlayAlbum}
                        size='icon'
                        className='h-14 w-14 bg-primary transition-all hover:scale-105 hover:bg-primary/90'
                        >
                            {isPlaying && currentAlbum?.songs.some(song => song._id === currentSong?._id) ? (
                                <Pause className='size-5 text-black' />
                            ) : (
                                <Play className='size-5 text-black' />
                            )}
                        </Button>
                    </div>

                    {/* table section */}
                    <div className="bg-black/20 backdrop-blur-sm">
                    {/* table header */}
                    <div className='grid grid-cols-[16px_4fr_2fr_1fr] gap-4 px-10 py-2 text-sm text-zinc-400
                    border-b border-white/5'>
                        <div>#</div>
                        <div>Title</div>
                        <div>Release Date</div>
                        <div>
                            <Clock className='h-4 w-4' />
                        </div>
                    </div>

                    {/* songs list */}
                    <div className='px-6'>
                        <div className="space-y-2 py-4">
                            {currentAlbum?.songs.map((song,index) => {
                                const isCurrentSong = currentSong?._id === song._id
                                
                                return (
                                <div key={song._id}
                                onClick={() => handlePlaySong(index)}
                                className={
                                    'grid grid-cols-[16px_4fr_2fr_1fr] gap-4 px-4 py-2 text-sm text-zinc-400hover:bg-white/5 rounded-md group cursor-pointer'}>
                                     <div className='flex items-center justify-center'>
                                        {isCurrentSong && isPlaying ? (
                                            <Pause className='size-4 text-primary' />
                                        ): (
                                            <span className='group-hover:hidden'>{index + 1}</span>
                                        )}
                                        {!isCurrentSong && (
                                            <Play className='h-4 w-4 hidden group-hover:block' />
                                        )}
                                     </div>

                                     <div className="flex items-center gap-3">
                                        <img src={song.imageUrl} alt={song.title} 
                                        className='size-10'/>

                                        <div>
                                            <div className={'font-medium text-white'}>{song.title}</div>
                                            <div>{song.artist}</div>
                                        </div>
                                     </div>
                                    <div className='flex items-center'>{song.createdAt.split("T")[0]}</div>
                                    <div className='flex items-center'>{formatDuration(song.duration)}</div>

                                </div>
                            )
                            })}   

                        </div>   

                    </div>
                    </div>
                </div>
            </div>
        </ScrollArea>
    </div>
  );
}

export default SongInfoPage
