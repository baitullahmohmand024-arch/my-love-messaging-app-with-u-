import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface VoiceMessagePlayerProps {
  mediaUrl: string;
  duration?: number;
  isOutgoing?: boolean;
}

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  mediaUrl,
  duration = 0,
  isOutgoing = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate deterministic aesthetic waveform heights for this voice note
  const waveformBars = React.useMemo(() => {
    const bars: number[] = [];
    const count = 22;
    let seed = 42;
    for (let i = 0; i < mediaUrl.length; i++) {
      seed = (seed * 31 + mediaUrl.charCodeAt(i)) % 1000;
    }
    for (let i = 0; i < count; i++) {
      const pseudo = Math.sin(seed + i * 1.3) * 0.5 + 0.5;
      const height = Math.floor(18 + pseudo * 70); // 18% to 88%
      bars.push(height);
    }
    return bars;
  }, [mediaUrl]);

  useEffect(() => {
    const audio = new Audio(mediaUrl);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setAudioDuration(Math.round(audio.duration));
      }
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.onerror = () => {
      setIsPlaying(false);
    };

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [mediaUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    }
  };

  const handleBarClick = (index: number) => {
    if (!audioRef.current || !audioDuration) return;
    const progress = index / waveformBars.length;
    const targetTime = progress * audioDuration;
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
    if (!isPlaying) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 py-1 px-1 min-w-[210px] max-w-[270px]">
      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
          isOutgoing
            ? 'bg-[#0b0c10] text-[#e0a96d] hover:bg-black/90 shadow-md'
            : 'bg-[#e0a96d] text-[#0b0c10] hover:bg-[#ebd0b0] shadow-md'
        }`}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current translate-x-0.5" />
        )}
      </button>

      {/* Waveform Visualization */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex items-center gap-[2.5px] h-7 py-1 cursor-pointer">
          {waveformBars.map((heightPercent, idx) => {
            const barProgress = (idx / waveformBars.length) * 100;
            const isPlayed = barProgress <= progressPercent;
            return (
              <div
                key={idx}
                onClick={() => handleBarClick(idx)}
                style={{ height: `${heightPercent}%` }}
                className={`w-[3px] rounded-full transition-colors ${
                  isPlayed
                    ? isOutgoing
                      ? 'bg-[#0b0c10]'
                      : 'bg-[#e0a96d]'
                    : isOutgoing
                    ? 'bg-[#0b0c10]/30'
                    : 'bg-white/20'
                }`}
              />
            );
          })}
        </div>

        {/* Time display */}
        <div className="flex items-center justify-between text-[10px] tracking-wider mt-0.5 opacity-75">
          <span>{formatTime(isPlaying ? currentTime : audioDuration)}</span>
          <Volume2 className="w-3 h-3 opacity-60" />
        </div>
      </div>
    </div>
  );
};
