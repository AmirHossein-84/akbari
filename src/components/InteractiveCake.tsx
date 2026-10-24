import React, { useEffect, useRef, useState } from 'react';
import { Flame, Mic, MicOff, RotateCcw, Sparkles, Volume2, VolumeX, Wind } from 'lucide-react';
import { motion } from 'motion/react';
import { CandleItem } from '../types';
import { soundEngine } from '../utils/soundEngine';

interface InteractiveCakeProps {
  onAllCandlesBlown: () => void;
  onWriteWishClick: () => void;
  celebrationCount: number;
}

const INITIAL_CANDLES: CandleItem[] = [
  { id: 1, label: 'تجربه و تخصص', subtitle: 'راهنمای مطمئن در چالش‌ها', isLit: true },
  { id: 2, label: 'اخلاق حرفه‌ای', subtitle: 'صبوری و متانت همیشگی', isLit: true },
  { id: 3, label: 'همدلی تیمی', subtitle: 'حامی و همراه همه همکاران', isLit: true },
  { id: 4, label: 'خلاقیت و تدبیر', subtitle: 'نگاه دقیق و نتیجه‌محور', isLit: true },
  { id: 5, label: 'انرژی و لبخند', subtitle: 'روحیه گرم در محیط کار', isLit: true },
];

const CANDLE_BODY_STYLES = [
  'from-rose-400 via-rose-500 to-rose-600 border-rose-300',
  'from-sky-400 via-sky-500 to-sky-600 border-sky-300',
  'from-amber-400 via-amber-500 to-amber-600 border-amber-300',
  'from-emerald-400 via-emerald-500 to-emerald-600 border-emerald-300',
  'from-pink-400 via-rose-400 to-amber-400 border-pink-300',
];

export const InteractiveCake: React.FC<InteractiveCakeProps> = ({
  onAllCandlesBlown,
  onWriteWishClick,
  celebrationCount,
}) => {
  const [candles, setCandles] = useState<CandleItem[]>(INITIAL_CANDLES);
  const [recentlyExtinguishedIds, setRecentlyExtinguishedIds] = useState<number[]>([]);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [isMelodyPlaying, setIsMelodyPlaying] = useState(false);
  const [isCakeSliced, setIsCakeSliced] = useState(false);

  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const hasTriggeredCelebrationRef = useRef(false);

  const litCount = candles.filter((c) => c.isLit).length;
  const allBlown = litCount === 0;

  useEffect(() => {
    if (allBlown && !hasTriggeredCelebrationRef.current) {
      hasTriggeredCelebrationRef.current = true;
      onAllCandlesBlown();
      soundEngine.playBirthdayMelody(setIsMelodyPlaying);
      stopMicrophoneListening();
    } else if (!allBlown) {
      hasTriggeredCelebrationRef.current = false;
    }
  }, [allBlown, onAllCandlesBlown]);

  useEffect(() => {
    return () => {
      stopMicrophoneListening();
    };
  }, []);

  const extinguishSingleCandle = (id: number) => {
    setCandles((prev) => {
      const target = prev.find((c) => c.id === id);
      if (!target || !target.isLit) return prev;
      soundEngine.playCandleBlowSound();
      setRecentlyExtinguishedIds((old) => [...old, id]);
      window.setTimeout(() => {
        setRecentlyExtinguishedIds((old) => old.filter((item) => item !== id));
      }, 1800);
      return prev.map((c) => (c.id === id ? { ...c, isLit: false } : c));
    });
  };

  const handleCandleToggle = (id: number) => {
    const target = candles.find((c) => c.id === id);
    if (!target) return;
    if (target.isLit) {
      extinguishSingleCandle(id);
    } else {
      soundEngine.playSparkleChime();
      setCandles((prev) => prev.map((c) => (c.id === id ? { ...c, isLit: true } : c)));
    }
  };

  const blowAllCandlesNow = () => {
    const litIds = candles.filter((c) => c.isLit).map((c) => c.id);
    if (litIds.length === 0) return;

    litIds.forEach((id, idx) => {
      window.setTimeout(() => {
        extinguishSingleCandle(id);
      }, idx * 140);
    });
  };

  const relightAllCandles = () => {
    soundEngine.stopBirthdayMelody(setIsMelodyPlaying);
    soundEngine.playSparkleChime();
    setIsCakeSliced(false);
    setCandles(INITIAL_CANDLES.map((c) => ({ ...c, isLit: true })));
  };

  const stopMicrophoneListening = () => {
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setIsListeningMic(false);
    setMicLevel(0);
  };

  const toggleMicrophoneListening = async () => {
    if (isListeningMic) {
      stopMicrophoneListening();
      return;
    }

    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.65;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      setIsListeningMic(true);

      let lastBlowTimestamp = 0;

      const detectBlow = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        const binCount = 20;
        for (let i = 0; i < binCount; i++) {
          sum += dataArray[i];
        }
        const avg = sum / binCount;
        const normalized = Math.min(100, Math.round((avg / 145) * 100));
        setMicLevel(normalized);

        const now = performance.now();
        if (normalized >= 46 && now - lastBlowTimestamp > 320) {
          lastBlowTimestamp = now;
          setCandles((prev) => {
            const firstLit = prev.find((c) => c.isLit);
            if (!firstLit) return prev;
            soundEngine.playCandleBlowSound();
            setRecentlyExtinguishedIds((old) => [...old, firstLit.id]);
            return prev.map((c) => (c.id === firstLit.id ? { ...c, isLit: false } : c));
          });
        }

        rafRef.current = window.requestAnimationFrame(detectBlow);
      };

      rafRef.current = window.requestAnimationFrame(detectBlow);
    } catch {
      setMicError(
        'دسترسی به میکروفون امکان‌پذیر نشد؛ می‌توانید با کلیک روی شمع‌ها یا دکمه «فوت کردن همه شمع‌ها» مراسم را اجرا کنید.'
      );
      setIsListeningMic(false);
    }
  };

  const handleMelodyToggle = () => {
    soundEngine.toggleBirthdayMelody(setIsMelodyPlaying);
  };

  return (
    <section
      id="cake-ceremony"
      className="py-24 md:py-32 border-t border-slate-100 bg-gradient-to-b from-white via-amber-50/35 to-rose-50/30 relative"
    >
      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14"
        >
          <div>
            <p className="text-xs font-bold text-rose-500 tracking-wide mb-2.5">
              ۰۲. آیین نمادین زادروز و آرزو
            </p>
            <h2
              className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              شمع‌های کیک تولد آقای اکبر زاده را فوت کنید
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleMelodyToggle}
              className="luxury-outline-button inline-flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isMelodyPlaying ? (
                <>
                  <VolumeX className="w-4 h-4 text-rose-500" />
                  <span>توقف ملودی جشن</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-sky-500" />
                  <span>پخش ملودی تولد</span>
                </>
              )}
            </button>

            <div className="text-xs text-slate-600 font-mono-num px-2 font-medium">
              <span>شمع‌های روشن: {litCount.toLocaleString('fa-IR')} از ۵</span>
              <span className="mx-2.5 text-slate-300" aria-hidden="true">·</span>
              <span>همراهی در جشن: {celebrationCount.toLocaleString('fa-IR')} مرتبه</span>
            </div>
          </div>
        </motion.div>

        {/* Main Interactive Studio Container */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="luxury-card rounded-3xl p-8 md:p-12 bg-white border-rose-100"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Right Column in RTL: Controls & Candle Pillars */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-7">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-2.5">
                  پنج شمع به پاس پنج ویژگی ماندگار ایشان
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  بر روی هر شمع کلیک کنید تا خاموش شود، یا با فعال‌سازی میکروفون به سمت صفحه فوت
                  کنید تا شعله‌ها با صدای فوت شما خاموش شده و کاغذرنگی‌های جشن به هوا بروند!
                </p>
              </div>

              {/* 5 Candle Pillar Interactive List */}
              <div className="space-y-2.5">
                {candles.map((candle, index) => (
                  <button
                    key={candle.id}
                    type="button"
                    onClick={() => handleCandleToggle(candle.id)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border text-right transition-all duration-200 cursor-pointer ${
                      candle.isLit
                        ? 'bg-amber-50/70 border-amber-200 hover:border-rose-300 hover:bg-rose-50/50 shadow-xs'
                        : 'bg-slate-50 border-slate-200/80 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono-num text-rose-500 font-bold">
                        ۰{(index + 1).toLocaleString('fa-IR')}.
                      </span>
                      <div className="truncate">
                        <span className="text-sm font-bold text-slate-900 ml-2">
                          {candle.label}
                        </span>
                        <span className="text-xs text-slate-500" aria-hidden="true">
                          · {candle.subtitle}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-bold whitespace-nowrap shrink-0 mr-3 flex items-center gap-1.5">
                      {candle.isLit ? (
                        <>
                          <Flame className="w-4 h-4 text-amber-500 fill-amber-400" />
                          <span className="text-amber-700">روشن (فوت کنید)</span>
                        </>
                      ) : (
                        <span className="text-emerald-600">خاموش شد</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>

              {/* Action Controls: Mic Blow + Instant Blow + Relight */}
              <div className="pt-2 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  {!allBlown ? (
                    <>
                      <button
                        type="button"
                        onClick={blowAllCandlesNow}
                        className="luxury-gold-button flex-1 inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-bold rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Wind className="w-4 h-4" />
                        <span>فوت کردن همه شمع‌ها</span>
                      </button>

                      <button
                        type="button"
                        onClick={toggleMicrophoneListening}
                        className={`inline-flex items-center justify-center gap-2 px-4 py-3.5 text-xs font-bold rounded-xl border transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                          isListeningMic
                            ? 'bg-sky-50 border-sky-400 text-sky-700'
                            : 'luxury-outline-button'
                        }`}
                      >
                        {isListeningMic ? (
                          <>
                            <MicOff className="w-4 h-4 text-rose-500" />
                            <span>توقف میکروفون</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4 text-sky-500" />
                            <span>فوت با میکروفون</span>
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={onWriteWishClick}
                        className="luxury-gold-button flex-1 inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-bold rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>ثبت پیام تبریک برای آقای اکبر زاده</span>
                      </button>

                      <button
                        type="button"
                        onClick={relightAllCandles}
                        className="luxury-outline-button inline-flex items-center justify-center gap-2 px-4 py-3.5 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4 text-sky-500" />
                        <span>روشن کردن مجدد</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Live Mic Wind Meter */}
                {isListeningMic && (
                  <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-sky-800 font-bold">
                        میکروفون فعال است؛ به سمت صفحه فوت کنید
                      </span>
                      <span className="font-mono-num text-sky-700 font-semibold">
                        شدت فوت: {micLevel.toLocaleString('fa-IR')}٪
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-sky-200">
                      <div
                        className="h-full bg-gradient-to-l from-rose-500 via-amber-400 to-sky-500 transition-all duration-75"
                        style={{ width: `${micLevel}%` }}
                      />
                    </div>
                  </div>
                )}

                {micError && (
                  <p className="text-xs text-rose-600 font-medium leading-relaxed">{micError}</p>
                )}
              </div>
            </div>

            {/* Left Column in RTL: Bright Joyful 3-Tier Pastel & Confetti Celebration Cake Stage */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center bg-gradient-to-b from-sky-50/70 via-rose-50/50 to-amber-50/60 rounded-2xl border border-rose-100 p-8 md:p-12 relative min-h-[460px] overflow-hidden">
              {/* Warm Sunny Glow Behind Cake */}
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-700"
                style={{
                  opacity: litCount > 0 ? 0.45 + litCount * 0.1 : 0.25,
                  background:
                    'radial-gradient(circle at 50% 35%, rgba(251, 191, 36, 0.32), rgba(244, 63, 94, 0.12) 45%, transparent 70%)',
                }}
                aria-hidden="true"
              />

              {/* Celebration Banner on Cake Stage When All Candles Blown */}
              {allBlown && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="relative z-10 mb-8 text-center max-w-md mx-auto bg-white/90 backdrop-blur-md px-6 py-4 rounded-2xl border border-rose-200 shadow-sm"
                >
                  <p className="text-xs font-extrabold text-rose-500 mb-1">
                    تولدت مبارک همکار عزیز!
                  </p>
                  <h4 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-1.5">
                    بهترین آرزوهای تیم بدرقه راه شماست، آقای اکبر زاده!
                  </h4>
                  <p className="text-xs text-slate-600">
                    اکنون می‌توانید کیک تولد را برش بزنید یا پیام یادگاری خود را ثبت کنید.
                  </p>
                </motion.div>
              )}

              {/* Interactive Cake SVG & Candle Array */}
              <div className="relative z-10 w-full max-w-[420px] flex flex-col items-center select-none">
                {/* 5 Interactive Candles Row Positioned on Top Tier */}
                <div className="flex items-end justify-center gap-5 sm:gap-7 mb-[-6px] z-20">
                  {candles.map((candle, idx) => {
                    const showSmoke = recentlyExtinguishedIds.includes(candle.id);
                    const candleStyle = CANDLE_BODY_STYLES[idx % CANDLE_BODY_STYLES.length];
                    return (
                      <button
                        key={candle.id}
                        type="button"
                        onClick={() => handleCandleToggle(candle.id)}
                        title={`${candle.label} - برای ${candle.isLit ? 'فوت کردن' : 'روشن کردن'} کلیک کنید`}
                        className="group relative flex flex-col items-center focus:outline-none cursor-pointer"
                      >
                        {/* Flame or Smoke */}
                        <div className="h-12 flex items-end justify-center relative">
                          {candle.isLit ? (
                            <div className="relative flex items-center justify-center animate-flame">
                              <div className="absolute -inset-3 rounded-full bg-amber-400/50 blur-md" />
                              <svg
                                width="22"
                                height="34"
                                viewBox="0 0 22 34"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M11 1C11 1 20 12.5 20 20.5C20 26.5 15.9706 31 11 31C6.02944 31 2 26.5 2 20.5C2 12.5 11 1 11 1Z"
                                  fill="url(#brightFlameOuter)"
                                />
                                <path
                                  d="M11 10C11 10 16 17 16 21.5C16 25 13.7614 28 11 28C8.23858 28 6 25 6 21.5C6 17 11 10 11 10Z"
                                  fill="#FEF08A"
                                />
                                <circle cx="11" cy="25" r="2.5" fill="#FFFFFF" />
                                <defs>
                                  <linearGradient
                                    id="brightFlameOuter"
                                    x1="11"
                                    y1="1"
                                    x2="11"
                                    y2="31"
                                    gradientUnits="userSpaceOnUse"
                                  >
                                    <stop stopColor="#FBBF24" />
                                    <stop offset="0.55" stopColor="#F59E0B" />
                                    <stop offset="1" stopColor="#F43F5E" />
                                  </linearGradient>
                                </defs>
                              </svg>
                            </div>
                          ) : (
                            showSmoke && (
                              <div className="animate-smoke text-slate-400">
                                <svg width="18" height="28" viewBox="0 0 18 28" fill="none">
                                  <path
                                    d="M9 26C6 20 13 15 8 9C5 5 11 2 9 0"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </div>
                            )
                          )}
                        </div>

                        {/* Wick */}
                        <div className="w-[2px] h-2 bg-slate-500" />

                        {/* Colorful Striped Birthday Candle Body */}
                        <div
                          className={`w-4 sm:w-5 h-16 sm:h-20 rounded-t-md border transition-transform duration-200 group-hover:-translate-y-1 relative overflow-hidden bg-gradient-to-b ${
                            candle.isLit
                              ? `${candleStyle} shadow-[0_6px_16px_rgba(244,63,94,0.22)]`
                              : 'from-slate-200 via-slate-300 to-slate-400 border-slate-300 opacity-75'
                          }`}
                        >
                          <div className="w-full h-1.5 bg-white/50 mt-3" />
                          <div className="w-full h-1.5 bg-white/50 mt-3" />
                          <div className="w-full h-1.5 bg-white/50 mt-3" />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* 3-Tier Cheerful Pastel & Confetti Celebration Cake SVG */}
                <svg
                  viewBox="0 0 380 230"
                  className="w-full max-w-[380px] drop-shadow-[0_18px_28px_rgba(15,23,42,0.12)]"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Top Tier (Strawberry Cream & Rose Frosting) */}
                  <rect
                    x="95"
                    y="12"
                    width="190"
                    height="56"
                    rx="12"
                    fill="#FFF1F2"
                    stroke="#FB7185"
                    strokeWidth="2.5"
                  />
                  {/* Rose Pink Frosting Drips on Top Tier */}
                  <path
                    d="M96 24C112 36 128 16 144 28C160 40 176 16 190 28C204 40 220 16 236 28C252 40 268 18 284 25V16C284 13.7909 282.209 12 280 12H100C97.7909 12 96 13.7909 96 16V24Z"
                    fill="#FB7185"
                  />
                  {/* Cheerful Sprinkles on Top Tier */}
                  <circle cx="125" cy="48" r="3.5" fill="#F59E0B" />
                  <circle cx="158" cy="44" r="3.5" fill="#0EA5E9" />
                  <circle cx="190" cy="50" r="4" fill="#10B981" />
                  <circle cx="222" cy="44" r="3.5" fill="#F43F5E" />
                  <circle cx="255" cy="48" r="3.5" fill="#F59E0B" />

                  {/* Middle Tier (Sky Blue & Sunshine Vanilla) */}
                  <rect
                    x="60"
                    y="68"
                    width="260"
                    height="68"
                    rx="14"
                    fill="#F0F9FF"
                    stroke="#38BDF8"
                    strokeWidth="2.5"
                  />
                  {/* Sky Blue Frosting Wave */}
                  <path
                    d="M62 80C85 92 108 72 132 84C156 96 180 72 204 84C228 96 252 72 276 84C295 92 308 76 318 80V74C318 70.6863 315.314 68 312 68H68C64.6863 68 62 70.6863 62 74V80Z"
                    fill="#38BDF8"
                  />
                  {/* Name Plaque on Middle Tier */}
                  <rect
                    x="112"
                    y="88"
                    width="156"
                    height="34"
                    rx="10"
                    fill="#FFFFFF"
                    stroke="#F59E0B"
                    strokeWidth="2"
                  />
                  <text
                    x="190"
                    y="110"
                    textAnchor="middle"
                    fill="#0F172A"
                    fontSize="13.5"
                    fontWeight="800"
                    fontFamily="Vazirmatn, sans-serif"
                  >
                    آقای اکبر زاده عزیز
                  </text>

                  {/* Bottom Grand Tier (Warm Sunshine & Fresh Mint) */}
                  <rect
                    x="28"
                    y="136"
                    width="324"
                    height="74"
                    rx="16"
                    fill="#FFFBEB"
                    stroke="#FBBF24"
                    strokeWidth="2.5"
                  />
                  {/* Mint & Rose Decorative Garland */}
                  <path
                    d="M45 154H335"
                    stroke="#34D399"
                    strokeWidth="2.5"
                    strokeDasharray="8 8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M45 192H335"
                    stroke="#FB7185"
                    strokeWidth="2"
                  />
                  <circle cx="80" cy="173" r="5.5" fill="#F43F5E" />
                  <circle cx="135" cy="173" r="5.5" fill="#0EA5E9" />
                  <circle cx="190" cy="173" r="6.5" fill="#10B981" />
                  <circle cx="245" cy="173" r="5.5" fill="#F59E0B" />
                  <circle cx="300" cy="173" r="5.5" fill="#F43F5E" />

                  {/* Cake Slice Cut Indicator when sliced */}
                  {isCakeSliced && (
                    <g>
                      <path
                        d="M172 68L190 210L224 210L208 68Z"
                        fill="#FFE4E6"
                        stroke="#F43F5E"
                        strokeWidth="2"
                      />
                    </g>
                  )}

                  {/* Cheerful Cake Stand */}
                  <rect
                    x="12"
                    y="210"
                    width="356"
                    height="12"
                    rx="6"
                    fill="url(#festiveStandGrad)"
                  />

                  <defs>
                    <linearGradient
                      id="festiveStandGrad"
                      x1="12"
                      y1="210"
                      x2="368"
                      y2="222"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#FB7185" />
                      <stop offset="0.35" stopColor="#FBBF24" />
                      <stop offset="0.7" stopColor="#34D399" />
                      <stop offset="1" stopColor="#38BDF8" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Cake Slice Action Button after candles are blown */}
                <div className="mt-6 flex items-center gap-4">
                  {allBlown ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCakeSliced((prev) => !prev);
                        soundEngine.playSparkleChime();
                      }}
                      className="px-5 py-2.5 text-xs font-bold rounded-xl bg-white border-2 border-rose-300 text-rose-600 hover:bg-rose-50 transition-colors shadow-xs cursor-pointer"
                    >
                      {isCakeSliced
                        ? 'کیک برش خورد · نوش جان همکاران!'
                        : 'بریدن نمادین کیک تولد'}
                    </button>
                  ) : (
                    <p className="text-xs text-slate-600 font-medium">
                      برای شروع آتش‌بازی، روی شمع‌های روشن کلیک کنید یا دکمه فوت کردن را بزنید
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
