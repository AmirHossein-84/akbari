import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

export const LuxuryMusicPlayer: React.FC = () => {
  const [musicState, setMusicState] = useState<{ isPlaying: boolean; isMuted: boolean }>({
    isPlaying: false,
    isMuted: false,
  });

  useEffect(() => {
    soundEngine.initClassicalAutoplay();
    const unsubscribe = soundEngine.subscribeClassical((state) => {
      setMusicState(state);
    });
    return unsubscribe;
  }, []);

  const handleToggleMute = () => {
    soundEngine.toggleClassicalMute();
  };

  const isActive = !musicState.isMuted;

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <button
        type="button"
        onClick={handleToggleMute}
        aria-label={isActive ? 'قطع صدای موسیقی کلاسیک' : 'پخش صدای موسیقی کلاسیک'}
        className="group flex items-center gap-3.5 px-4 py-2.5 rounded-full bg-white/95 backdrop-blur-xl border border-rose-200 hover:border-rose-400 shadow-[0_12px_32px_rgba(244,63,94,0.14)] transition-all duration-300 cursor-pointer"
      >
        {/* Minimalist Animated Soundwave Bars */}
        <div className="flex items-end gap-[3px] h-3.5 w-4 justify-center" aria-hidden="true">
          <span
            className={`w-[2.5px] rounded-full bg-rose-500 transition-all duration-300 ${
              isActive ? 'h-3.5 animate-eq-1' : 'h-1 opacity-40'
            }`}
          />
          <span
            className={`w-[2.5px] rounded-full bg-amber-500 transition-all duration-300 ${
              isActive ? 'h-3.5 animate-eq-2' : 'h-1 opacity-40'
            }`}
          />
          <span
            className={`w-[2.5px] rounded-full bg-sky-500 transition-all duration-300 ${
              isActive ? 'h-3.5 animate-eq-3' : 'h-1 opacity-40'
            }`}
          />
        </div>

        {/* Track Metadata */}
        <div className="text-right pr-1 border-r border-slate-200">
          <p className="text-[11px] font-bold text-slate-800 tracking-wide whitespace-nowrap">
            {isActive ? 'موسیقی کلاسیک بی‌کلام' : 'موسیقی بی‌صدا (Mute)'}
          </p>
          <p className="text-[10px] text-slate-500 font-display-serif tracking-wider whitespace-nowrap">
            Satie · Gymnopédie No. 1
          </p>
        </div>

        {/* Mute / Unmute Icon */}
        <div className="w-7 h-7 rounded-full bg-rose-50 border border-rose-200 group-hover:bg-rose-100 flex items-center justify-center text-rose-600 transition-colors">
          {isActive ? (
            <Volume2 className="w-3.5 h-3.5" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </button>
    </div>
  );
};
