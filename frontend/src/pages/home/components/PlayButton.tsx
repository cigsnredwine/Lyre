
import type { Song } from "@/types";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { Button } from "@/components/ui/button";
import { Pause, Play } from "lucide-react";

const PlayButton = ({song}: {song: Song}) => {
    const {currentSong,isPlaying, setCurrentSong, togglePlay} = usePlayerStore();
    const isCurrentSong = currentSong?._id === song._id;

    const handlePlay = () => {
        if(isCurrentSong) togglePlay();
        else setCurrentSong(song);
    };



  return <Button
  size={'icon'}
  onClick={handlePlay}
  aria-label={`${isCurrentSong && isPlaying ? "Pause" : "Play"} ${song.title}`}
  aria-pressed={isCurrentSong && isPlaying}
  className={`music-play-button play-button-surface absolute bottom-2 right-2 size-10 translate-y-2 group-hover:translate-y-0 sm:bottom-3 sm:size-8 ${
    isCurrentSong ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
  }`}

  >

    {isCurrentSong && isPlaying ? (
        <Pause className="size-5" />
    ) : (
        <Play className="size-5" />
    
    )}

  </Button>
}

export default PlayButton
