/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Award, Cake, Compass, HeartHandshake, Sparkles, Star, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { FireworksCanvas } from './components/FireworksCanvas';
import { InteractiveCake } from './components/InteractiveCake';
import { LuxuryMusicPlayer } from './components/LuxuryMusicPlayer';
import { WishesWall } from './components/WishesWall';
import { BirthdayWish, StickerType } from './types';
import { soundEngine } from './utils/soundEngine';

const FALLBACK_WISHES: BirthdayWish[] = [
  {
    id: 'wish-1',
    senderName: 'سارا محمدی',
    senderRole: 'تیم محصول و طراحی',
    message:
      'آقای رضا اکبرزاده عزیز، تولدتون هزاران بار مبارک! حضور گرم، آرامش مثال‌زدنی و تجربه‌ای که همیشه بی‌دریغ در اختیار بچه‌های تیم می‌گذارید، کار کردن کنار شما رو به یکی از بهترین بخش‌های شرکت تبدیل کرده. براتون سالی پر از سلامتی و موفقیت‌های بزرگ آرزو می‌کنم.',
    sticker: 'crown',
    likes: 24,
    createdAt: '۱ ساعت پیش',
  },
  {
    id: 'wish-2',
    senderName: 'امیرحسین رضایی',
    senderRole: 'تیم فنی و مهندسی',
    message:
      'زادروزتون فرخنده آقای رضا اکبرزاده! هر وقت پروژه به چالش سختی خورده، یک مشورت کوتاه با شما کافی بوده تا بهترین راه‌حل پیدا بشه. واقعاً ستون اصلی تیم ما هستید. امیدوارم همیشه لبتون خندون و دلتون شاد باشه.',
    sticker: 'trophy',
    likes: 19,
    createdAt: '۲ ساعت پیش',
  },
  {
    id: 'wish-3',
    senderName: 'نیلوفر کاظمی',
    senderRole: 'واحد عملیات و برنامه‌ریزی',
    message:
      'تولدتون مبارک همکار درجه‌یک و بااخلاق! از صبوری، دقت نظر و انرژی مثبتی که هر روز صبح به جمع ما میارید بی‌نهایت ممنونیم. آرزو می‌کنم امسال به همه اهداف و آرزوهای قشنگتون برسید.',
    sticker: 'sparkles',
    likes: 16,
    createdAt: '۳ ساعت پیش',
  },
  {
    id: 'wish-4',
    senderName: 'مهدی فرهادی',
    senderRole: 'تیم توسعه کسب‌وکار',
    message:
      'آقای رضا اکبرزاده گرامی، تولدتون مبارک! داشتن همکاری به باصلابتی و خوش‌فکری شما یک امتیاز بزرگ برای کل مجموعه‌ست. همیشه سلامت، پرانرژی و برقرار باشید.',
    sticker: 'rocket',
    likes: 14,
    createdAt: '۴ ساعت پیش',
  },
  {
    id: 'wish-5',
    senderName: 'پریسا علوی',
    senderRole: 'منابع انسانی و فرهنگ سازمانی',
    message:
      'تولد یکی از محبوب‌ترین و تاثیرگذارترین اعضای تیم مبارک! ممنون که همیشه حامی و راهنمای همه همکاران هستید. امیدوارم سال جدید زندگی‌تون سرشار از اتفاقات درخشان باشه.',
    sticker: 'heart',
    likes: 21,
    createdAt: '۵ ساعت پیش',
  },
  {
    id: 'wish-6',
    senderName: 'سینا نادری',
    senderRole: 'تیم فنی و زیرساخت',
    message:
      'آقای رضا اکبرزاده عزیز، تولدتون کلی مبارک باشه! به امید سال‌های طولانی همکاری کنار هم و جشن گرفتن موفقیت‌های بیشتر در کنار شما.',
    sticker: 'cake',
    likes: 12,
    createdAt: '۶ ساعت پیش',
  },
];

export default function App() {
  const [wishes, setWishes] = useState<BirthdayWish[]>(() => {
    try {
      const saved = localStorage.getItem('birthday_wishes_store');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore storage error
    }
    return FALLBACK_WISHES;
  });
  const [celebrationCount, setCelebrationCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('birthday_celebration_count');
      return saved ? Number(saved) || 48 : 48;
    } catch {
      return 48;
    }
  });
  const [likedIds, setLikedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('birthday_liked_wishes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [burstTrigger, setBurstTrigger] = useState<number>(0);

  const wishFormRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch('/api/wishes')
      .then((res) => {
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          return res.json();
        }
        return null;
      })
      .then((data) => {
        if (data && Array.isArray(data.wishes)) {
          setWishes(data.wishes);
          try {
            localStorage.setItem('birthday_wishes_store', JSON.stringify(data.wishes));
          } catch {
            // Ignore
          }
          if (typeof data.celebrationCount === 'number') {
            setCelebrationCount(data.celebrationCount);
          }
        }
      })
      .catch(() => {
        // Fallback / localStorage already loaded
      });

    const timer = window.setTimeout(() => {
      setBurstTrigger(1);
    }, 600);
    return () => window.clearTimeout(timer);
  }, []);

  const triggerFireworks = useCallback(() => {
    setBurstTrigger((prev) => prev + 1);
    soundEngine.playSparkleChime();
    setCelebrationCount((prev) => {
      const next = prev + 1;
      try {
        localStorage.setItem('birthday_celebration_count', String(next));
      } catch {
        // Ignore
      }
      return next;
    });
    fetch('/api/ceremony/celebrate', { method: 'POST' }).catch(() => {});
  }, []);

  const scrollToWishForm = useCallback(() => {
    const wallEl = document.getElementById('wishes-wall');
    if (wallEl) {
      wallEl.scrollIntoView({ behavior: 'smooth' });
    }
    window.setTimeout(() => {
      const nameInput = document.getElementById('sender-name');
      nameInput?.focus();
    }, 550);
  }, []);

  const handleAddWish = async (payload: {
    senderName: string;
    senderRole: string;
    message: string;
    sticker: StickerType;
  }) => {
    try {
      const response = await fetch('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.wish) {
          setWishes((prev) => {
            const next = [data.wish, ...prev];
            try {
              localStorage.setItem('birthday_wishes_store', JSON.stringify(next));
            } catch {
              // Ignore
            }
            return next;
          });
          setBurstTrigger((prev) => prev + 1);
          if (typeof data.celebrationCount === 'number') {
            setCelebrationCount(data.celebrationCount);
          }
          return;
        }
      }
    } catch {
      // Fallback to local state addition on static hosts like Vercel
    }

    const fallbackNewWish: BirthdayWish = {
      id: `local-${Date.now()}`,
      senderName: payload.senderName,
      senderRole: payload.senderRole,
      message: payload.message,
      sticker: payload.sticker,
      likes: 1,
      createdAt: 'لحظاتی پیش',
    };
    setWishes((prev) => {
      const next = [fallbackNewWish, ...prev];
      try {
        localStorage.setItem('birthday_wishes_store', JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
    setBurstTrigger((prev) => prev + 1);
  };

  const handleLikeWish = (id: string) => {
    if (likedIds.includes(id)) return;
    soundEngine.playSparkleChime();

    const updatedLiked = [...likedIds, id];
    setLikedIds(updatedLiked);
    try {
      localStorage.setItem('birthday_liked_wishes', JSON.stringify(updatedLiked));
    } catch {
      // Ignore storage error
    }

    setWishes((prev) => {
      const next = prev.map((w) => (w.id === id ? { ...w, likes: w.likes + 1 } : w));
      try {
        localStorage.setItem('birthday_wishes_store', JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });

    fetch(`/api/wishes/${id}/like`, { method: 'POST' }).catch(() => {});
  };

  const handleDeleteWish = async (id: string) => {
    const response = await fetch(`/api/wishes/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error('Unable to delete wish');
    }

    setWishes((prev) => {
      const next = prev.filter((wish) => wish.id !== id);
      try {
        localStorage.setItem('birthday_wishes_store', JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 relative selection:bg-rose-100 selection:text-rose-700">
      {/* Joyful Colorful Confetti & Fireworks Canvas */}
      <FireworksCanvas burstTrigger={burstTrigger} />

      {/* Minimalist Classical Music Player (Bottom Corner) */}
      <LuxuryMusicPlayer />

      {/* Strict 3-Zone Top Navigation Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-8 px-6 py-4">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            className="text-lg font-extrabold tracking-tight text-rose-600 whitespace-nowrap shrink-0"
          >
            جشن تولد آقای رضا اکبرزاده
          </a>

          {/* Zone 2: 4 concise single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a
              href="#hero-tribute"
              className="hover:text-rose-600 hover:underline underline-offset-8 transition-colors duration-200 whitespace-nowrap shrink-0"
            >
              تقدیرنامه تیم
            </a>
            <a
              href="#qualities"
              className="hover:text-sky-600 hover:underline underline-offset-8 transition-colors duration-200 whitespace-nowrap shrink-0"
            >
              ویژگی‌های برجسته
            </a>
            <a
              href="#cake-ceremony"
              className="hover:text-amber-600 hover:underline underline-offset-8 transition-colors duration-200 whitespace-nowrap shrink-0"
            >
              مراسم کیک و شمع
            </a>
            <a
              href="#wishes-wall"
              className="hover:text-emerald-600 hover:underline underline-offset-8 transition-colors duration-200 whitespace-nowrap shrink-0"
            >
              دیوار یادگاری
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={scrollToWishForm}
              className="luxury-gold-button px-5 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
            >
              ثبت پیام تبریک
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="relative overflow-hidden">
        {/* Soft Cheerful Pastel Background Aura Blobs */}
        <div
          className="absolute -top-24 right-10 w-[520px] h-[420px] rounded-full bg-rose-100/70 blur-[130px] pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-32 left-10 w-[480px] h-[400px] rounded-full bg-sky-100/70 blur-[130px] pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-96 right-1/3 w-[420px] h-[340px] rounded-full bg-amber-100/60 blur-[130px] pointer-events-none"
          aria-hidden="true"
        />

        {/* Hero Split Section */}
        <section id="hero-tribute" className="pt-14 pb-20 md:pt-24 md:pb-28 relative z-10">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
              {/* Right Column in RTL: Typographic Hierarchy & Primary Action */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-7 flex flex-col justify-center space-y-7"
              >
                <div className="text-xs font-bold text-rose-500 tracking-wide">
                  <span>جشن زادروز و قدردانی تیم</span>
                  <span className="mx-2.5 text-slate-300" aria-hidden="true">·</span>
                  <span className="text-sky-600">همکار کلیدی و ستون ارزشمند مجموعه</span>
                </div>

                <h1
                  className="font-extrabold text-slate-900 leading-[1.24] tracking-tight"
                  style={{
                    fontSize: 'clamp(2.35rem, 4.2vw, 3.75rem)',
                    textWrap: 'balance',
                  }}
                >
                  تولدتان هزاران بار مبارک،{' '}
                  <span className="luxury-gold-gradient-text font-extrabold">
                    آقای رضا اکبرزاده عزیز!
                  </span>
                </h1>

                <p className="text-base md:text-lg text-slate-600 leading-[1.9] max-w-[62ch] font-normal">
                  حضور شما در جمع ما، فقط حضور یک همکار باتجربه نیست؛ بلکه مایه دلگرمی، آرامش در
                  روزهای پرچالش و الهام‌بخش انرژی مثبت و حرفه‌ای‌گری برای تک‌تک اعضای تیم است.
                  امروز به بهانه تولدتان دور هم جمع شده‌ایم تا با شادی و لبخند از سال‌ها همراهی و
                  معرفت شما قدردانی کنیم.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <a
                    href="#cake-ceremony"
                    className="luxury-gold-button inline-flex items-center justify-center gap-2.5 px-7 py-4 text-sm font-bold rounded-xl whitespace-nowrap shrink-0"
                  >
                    <Cake className="w-4 h-4" />
                    <span>فوت کردن شمع‌های تولد</span>
                  </a>

                  <button
                    type="button"
                    onClick={triggerFireworks}
                    className="luxury-outline-button inline-flex items-center justify-center gap-2.5 px-6 py-4 text-sm font-bold rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>پرتاب کاغذرنگی و شادی</span>
                  </button>
                </div>
              </motion.div>

              {/* Left Column in RTL: Cheerful Pastel Celebration Tribute Card */}
              <motion.div
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.85, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-5 flex"
              >
                <div className="w-full lg:h-full rounded-3xl bg-gradient-to-br from-rose-50/90 via-white to-sky-50/90 border-2 border-rose-100 shadow-[0_20px_50px_-12px_rgba(244,63,94,0.12)] p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
                  {/* Decorative Cheerful Rings SVG */}
                  <svg
                    className="absolute inset-0 w-full h-full opacity-35 pointer-events-none"
                    viewBox="0 0 400 400"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <circle
                      cx="200"
                      cy="200"
                      r="160"
                      stroke="#FB7185"
                      strokeWidth="1.2"
                      strokeDasharray="6 8"
                    />
                    <circle cx="200" cy="200" r="120" stroke="#38BDF8" strokeWidth="1" />
                    <circle cx="70" cy="80" r="8" fill="#FBBF24" fillOpacity="0.5" />
                    <circle cx="330" cy="95" r="6" fill="#34D399" fillOpacity="0.6" />
                    <circle cx="85" cy="320" r="7" fill="#38BDF8" fillOpacity="0.5" />
                    <circle cx="320" cy="310" r="8" fill="#FB7185" fillOpacity="0.5" />
                  </svg>

                  <div className="relative z-10 flex items-center justify-between text-xs font-bold text-slate-500">
                    <span className="text-rose-500">کارت تبریک اختصاصی تیم</span>
                    <span className="font-mono-num text-sky-600">۱۴۰۵</span>
                  </div>

                  {/* Center Joyful Medallion */}
                  <div className="relative z-10 my-8 flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-rose-500 via-amber-400 to-sky-400 p-[2px] mb-6 shadow-[0_12px_30px_rgba(244,63,94,0.22)]">
                      <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center">
                        <Award className="w-11 h-11 text-rose-500" />
                      </div>
                    </div>

                    <p className="text-xs text-emerald-600 font-extrabold mb-1.5">
                      به افتخار همکار عزیز و دوست‌داشتنی
                    </p>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
                      جناب آقای رضا اکبرزاده
                    </h2>
                    <p className="text-xs text-slate-600 max-w-xs leading-[1.9] font-medium">
                      «تیمی که یک راهنمای باتجربه، صبور و خوش‌قلب در کنار خود دارد، هر روز را با
                      انرژی و لبخند آغاز می‌کند.»
                    </p>
                  </div>

                  <div className="relative z-10 pt-5 border-t border-rose-200/60 flex items-center justify-between text-xs text-slate-600 font-medium">
                    <span>امضای جمعی اعضای تیم</span>
                    <button
                      type="button"
                      onClick={scrollToWishForm}
                      className="text-rose-600 hover:text-sky-600 transition-colors font-extrabold cursor-pointer"
                    >
                      افزودن تبریک شما ←
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Full-Width 4-Column KPI Impact Strip Below Hero Split */}
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.75, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-5"
            >
              <div className="rounded-2xl bg-rose-50/60 border border-rose-200/80 p-6 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-2xl md:text-3xl font-extrabold text-rose-600 font-mono-num mb-1.5">
                  ۱۰۰٪
                </p>
                <p className="text-sm font-bold text-slate-900">تعهد و اتکاپذیری</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  تکیه‌گاه مطمئن تیم در تمام تصمیم‌گیری‌ها
                </p>
              </div>

              <div className="rounded-2xl bg-sky-50/60 border border-sky-200/80 p-6 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-2xl md:text-3xl font-extrabold text-sky-600 font-mono-num mb-1.5">
                  +{wishes.length.toLocaleString('fa-IR')}
                </p>
                <p className="text-sm font-bold text-slate-900">یادگاری و تبریک ثبت‌شده</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  پیام‌های صمیمی از سوی همکاران واحدهای مختلف
                </p>
              </div>

              <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-6 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-2xl md:text-3xl font-extrabold text-amber-600 font-mono-num mb-1.5">
                  +{celebrationCount.toLocaleString('fa-IR')}
                </p>
                <p className="text-sm font-bold text-slate-900">مراسم شادی و کاغذرنگی</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  دفعات همراهی همکاران در جشن زادروز امروز
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50/60 border border-emerald-200/80 p-6 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-2xl md:text-3xl font-extrabold text-emerald-600 font-mono-num mb-1.5">
                  بی‌نهایت
                </p>
                <p className="text-sm font-bold text-slate-900">احترام و محبوبیت</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  خاطرات شیرین و لبخندهای همیشگی در محیط کار
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Section 01: Asymmetric Bento Grid of Mr. Reza Akbarzadeh's Core Qualities */}
        <section id="qualities" className="py-24 md:py-32 border-t border-slate-100 bg-slate-50/50 relative">
          <div className="max-w-[1200px] mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="mb-14"
            >
              <p className="text-xs font-bold text-sky-600 tracking-wide mb-2.5">
                ۰۱. چرا آقای رضا اکبرزاده برای تیم ما بی‌جایگزین هستند؟
              </p>
              <h2
                className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                سه رکن شخصیتی و حرفه‌ای که هر روز از ایشان می‌آموزیم
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Wide Marquee Bento Card (col-span-2) */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-2 luxury-card luxury-card-interactive rounded-3xl p-8 md:p-10 flex flex-col justify-between bg-white border-sky-100"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-mono-num text-sky-600 font-bold">
                      ۰۱ · تجربه، درایت و راهگشایی
                    </span>
                    <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600">
                      <Compass className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-2xl font-extrabold text-slate-900 mb-3">
                    قطب‌نمای مطمئن تیم در پیچیده‌ترین پروژه‌ها
                  </h3>
                  <p className="text-sm md:text-base text-slate-600 leading-[1.9]">
                    هر زمان که تیم با مسئله‌ای تازه یا تصمیمی حساس روبه‌رو می‌شود، دیدگاه عمیق و
                    تجربه ارزشمند آقای رضا اکبرزاده مسیر را روشن و هموار می‌کند. توانایی ایشان در دیدن
                    تصویر کلان در کنار توجه به ظرافت‌ها، استاندارد کاری کل مجموعه را ارتقا داده است.
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2.5 text-xs font-medium text-slate-500">
                  <span className="text-sky-700">تصمیم‌گیری دقیق</span>
                  <span aria-hidden="true">·</span>
                  <span>انتقال سخاوتمندانه تجربه</span>
                  <span aria-hidden="true">·</span>
                  <span>حل مسئله با آرامش</span>
                </div>
              </motion.div>

              {/* Compact Bento Card 2 */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="luxury-card luxury-card-interactive rounded-3xl p-8 md:p-10 flex flex-col justify-between bg-white border-rose-100"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-mono-num text-rose-500 font-bold">
                      ۰۲ · فرهنگ و منش
                    </span>
                    <div className="p-2.5 rounded-xl bg-rose-50 text-rose-500">
                      <HeartHandshake className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-xl font-extrabold text-slate-900 mb-3">
                    وقار، صبوری و احترام متقابل
                  </h3>
                  <p className="text-sm text-slate-600 leading-[1.9]">
                    رفتار محترمانه، روی گشاده و حوصله کم‌نظیر ایشان در پاسخگویی به همکاران، فضای
                    تیم را به محیطی امن، صمیمی و باانگیزه تبدیل کرده است.
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-100 flex items-center gap-2.5 text-xs font-medium text-slate-500">
                  <span className="text-rose-600">ارتباط سازنده</span>
                  <span aria-hidden="true">·</span>
                  <span>روحیه تیمی شاداب</span>
                </div>
              </motion.div>

              {/* Compact Bento Card 3 */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.7, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
                className="luxury-card luxury-card-interactive rounded-3xl p-8 md:p-10 flex flex-col justify-between bg-white border-emerald-100"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-mono-num text-emerald-600 font-bold">
                      ۰۳ · منتورینگ و همراهی
                    </span>
                    <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-xl font-extrabold text-slate-900 mb-3">
                    حامی رشد و شکوفایی همکاران
                  </h3>
                  <p className="text-sm text-slate-600 leading-[1.9]">
                    بسیاری از اعضای تیم، پیشرفت حرفه‌ای و اعتمادبه‌نفس کاری خود را مدیون راهنمایی‌ها
                    و بازخوردهای دلسوزانه آقای رضا اکبرزاده هستند.
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-100 flex items-center gap-2.5 text-xs font-medium text-slate-500">
                  <span className="text-emerald-700">آموزش مستمر</span>
                  <span aria-hidden="true">·</span>
                  <span>پشتیبان مطمئن</span>
                </div>
              </motion.div>

              {/* Wide Quote / Tribute Bento Card (col-span-2) */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-2 rounded-3xl bg-gradient-to-l from-amber-50/90 via-rose-50/70 to-sky-50/90 border border-amber-200/80 p-8 md:p-10 flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-xs font-extrabold text-amber-700">
                      پیام قدردانی به مناسبت زادروز
                    </span>
                    <div className="p-2 rounded-xl bg-white/80 text-amber-500">
                      <Star className="w-5 h-5 fill-amber-400" />
                    </div>
                  </div>

                  <blockquote className="text-lg md:text-2xl font-extrabold text-slate-900 leading-[1.8] mb-6">
                    «آقای رضا اکبرزاده عزیز، از اینکه هر روز با دانش، متانت و لبخندتان کنار ما هستید
                    سپاسگزاریم. امیدواریم سال جدید زندگی‌تان سرشار از تندرستی، شادی و موفقیت‌های
                    ماندگار باشد.»
                  </blockquote>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-rose-200/60">
                  <span className="text-xs font-semibold text-slate-600">
                    از طرف تمامی همکاران و دوستان شما در مجموعه
                  </span>

                  <button
                    type="button"
                    onClick={scrollToWishForm}
                    className="luxury-gold-button px-5 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    ثبت یادگاری شما
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Section 02: Interactive Cake & Candle Blowing Ceremony */}
        <InteractiveCake
          onAllCandlesBlown={triggerFireworks}
          onWriteWishClick={scrollToWishForm}
          celebrationCount={celebrationCount}
        />

        {/* Section 03: Colleague Wishes & Memory Wall */}
        <WishesWall
          wishes={wishes}
          likedIds={likedIds}
          onAddWish={handleAddWish}
          onLikeWish={handleLikeWish}
          onDeleteWish={handleDeleteWish}
          formRef={wishFormRef}
        />
      </main>

      {/* Clean Bright Footer */}
      <footer className="border-t border-slate-200/80 py-12 bg-slate-50/70">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 font-medium">
          <div>
            <span className="font-extrabold text-rose-600">جشن تولد آقای رضا اکبرزاده</span>
            <span className="mx-2.5 text-slate-300" aria-hidden="true">·</span>
            <span>طراحی شده با مهر و احترام توسط همکاران تیم</span>
          </div>

          <div className="flex items-center gap-7">
            <a href="#top" className="hover:text-rose-600 transition-colors">
              بازگشت به بالا
            </a>
            <a href="#cake-ceremony" className="hover:text-sky-600 transition-colors">
              مراسم کیک
            </a>
            <a href="#wishes-wall" className="hover:text-emerald-600 transition-colors">
              ثبت یادگاری
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
