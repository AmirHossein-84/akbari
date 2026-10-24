import React, { useMemo, useState } from 'react';
import {
  Award,
  Cake,
  Check,
  Crown,
  Heart,
  Rocket,
  Search,
  Send,
  Sparkles,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { BirthdayWish, StickerType, WishSortMode } from '../types';
import { soundEngine } from '../utils/soundEngine';

interface WishesWallProps {
  wishes: BirthdayWish[];
  likedIds: string[];
  onAddWish: (newWish: {
    senderName: string;
    senderRole: string;
    message: string;
    sticker: StickerType;
  }) => Promise<void>;
  onLikeWish: (id: string) => void;
  onDeleteWish: (id: string) => Promise<void>;
  formRef: React.RefObject<HTMLDivElement | null>;
}

interface StickerOption {
  id: StickerType;
  label: string;
  description: string;
  accentBg: string;
}

const STICKER_OPTIONS: StickerOption[] = [
  { id: 'crown', label: 'تاج افتخار', description: 'ستون و راهنمای تیم', accentBg: 'bg-amber-50 border-amber-200 text-amber-700' },
  { id: 'trophy', label: 'جام قهرمانی', description: 'درخشش در پروژه‌ها', accentBg: 'bg-sky-50 border-sky-200 text-sky-700' },
  { id: 'sparkles', label: 'ستاره درخشان', description: 'انرژی و خوش‌فکری', accentBg: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  { id: 'heart', label: 'قلب صمیمی', description: 'همدلی و رفاقت', accentBg: 'bg-rose-50 border-rose-200 text-rose-700' },
  { id: 'rocket', label: 'موشک پیشرفت', description: 'نگاه رو به جلو', accentBg: 'bg-sky-50 border-sky-200 text-sky-700' },
  { id: 'cake', label: 'شیرینی جشن', description: 'شادی و لبخند', accentBg: 'bg-pink-50 border-pink-200 text-pink-700' },
];

const QUICK_TEMPLATES: string[] = [
  'آقای اکبر زاده عزیز، تولدتون مبارک! کار کردن در کنار همکاری به باتجربگی و خوش‌اخلاقی شما افتخار بزرگی برای همه ماست. براتون سالی پر از سلامتی و آرامش آرزو می‌کنم.',
  'زادروزتون فرخنده آقای اکبر زاده! ممنون که همیشه با صبوری و نگاه دقیقتون، سخت‌ترین چالش‌های تیم رو به بهترین شکل حل می‌کنید. همیشه بدرخشید.',
  'تولدتون هزاران بار مبارک همکار درجه‌یک! امیدوارم سال جدید زندگی‌تون پر از اتفاقات فوق‌العاده، لبخندهای از ته دل و موفقیت‌های پی‌درپی باشه.',
];

export const renderStickerIcon = (sticker: StickerType, className = 'w-5 h-5') => {
  switch (sticker) {
    case 'crown':
      return <Crown className={`${className} text-amber-500`} />;
    case 'trophy':
      return <Award className={`${className} text-sky-500`} />;
    case 'sparkles':
      return <Sparkles className={`${className} text-emerald-500`} />;
    case 'heart':
      return <Heart className={`${className} text-rose-500`} />;
    case 'rocket':
      return <Rocket className={`${className} text-sky-500`} />;
    case 'cake':
    default:
      return <Cake className={`${className} text-pink-500`} />;
  }
};

export const getStickerLabel = (sticker: StickerType): string => {
  return STICKER_OPTIONS.find((s) => s.id === sticker)?.label || 'یادگاری جشن';
};

export const WishesWall: React.FC<WishesWallProps> = ({
  wishes,
  likedIds,
  onAddWish,
  onLikeWish,
  onDeleteWish,
  formRef,
}) => {
  const [senderName, setSenderName] = useState('');
  const [senderRole, setSenderRole] = useState('');
  const [message, setMessage] = useState('');
  const [selectedSticker, setSelectedSticker] = useState<StickerType>('crown');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [sortMode, setSortMode] = useState<WishSortMode>(WishSortMode.ALL);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWishModal, setSelectedWishModal] = useState<BirthdayWish | null>(null);
  const [deletingWishId, setDeletingWishId] = useState<string | null>(null);

  const filteredWishes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = wishes.filter((w) => {
      if (!q) return true;
      return (
        w.senderName.toLowerCase().includes(q) ||
        w.senderRole.toLowerCase().includes(q) ||
        w.message.toLowerCase().includes(q)
      );
    });

    if (sortMode === WishSortMode.POPULAR) {
      return [...list].sort((a, b) => b.likes - a.likes);
    }
    return list;
  }, [wishes, sortMode, searchQuery]);

  const totalLikes = useMemo(
    () => wishes.reduce((acc, item) => acc + item.likes, 0),
    [wishes]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!senderName.trim()) {
      setFormError('لطفاً نام و نام خانوادگی خود را وارد نمایید.');
      return;
    }
    if (!message.trim() || message.trim().length < 5) {
      setFormError('لطفاً متن پیام تبریک خود را بنویسید (حداقل ۵ حرف).');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddWish({
        senderName: senderName.trim(),
        senderRole: senderRole.trim() || 'همکار تیم',
        message: message.trim(),
        sticker: selectedSticker,
      });
      soundEngine.playSparkleChime();
      setSenderName('');
      setSenderRole('');
      setMessage('');
      setSubmitSuccess(true);
      window.setTimeout(() => setSubmitSuccess(false), 4000);
    } catch {
      setFormError('خطایی در ثبت پیام رخ داد؛ لطفاً دوباره تلاش کنید.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (wish: BirthdayWish) => {
    if (!window.confirm(`پیام «${wish.senderName}» حذف شود؟`)) return;

    setDeletingWishId(wish.id);
    try {
      await onDeleteWish(wish.id);
      if (selectedWishModal?.id === wish.id) {
        setSelectedWishModal(null);
      }
    } finally {
      setDeletingWishId(null);
    }
  };

  return (
    <section id="wishes-wall" className="py-24 md:py-32 border-t border-slate-100 bg-white relative">
      {/* Subtle Pastel Background Glows */}
      <div
        className="absolute top-20 left-10 w-[450px] h-[350px] rounded-full bg-sky-100/50 blur-[120px] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-20 right-10 w-[450px] h-[350px] rounded-full bg-emerald-100/40 blur-[120px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        {/* Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14"
        >
          <div>
            <p className="text-xs font-bold text-emerald-600 tracking-wide mb-2.5">
              ۰۳. دفترچه یادگاری و قدردانی همکاران
            </p>
            <h2
              className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              پیام‌های تبریک و خاطرات تیم برای آقای اکبر زاده
            </h2>
          </div>

          <div className="text-xs text-slate-600 font-mono-num font-medium">
            <span>{wishes.length.toLocaleString('fa-IR')} یادگاری ثبت‌شده</span>
            <span className="mx-2.5 text-slate-300" aria-hidden="true">·</span>
            <span>{totalLikes.toLocaleString('fa-IR')} لایک و همراهی</span>
          </div>
        </motion.div>

        {/* Two-Column Asymmetric Layout: Submission Form (5 cols) + Wishes Grid (7 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Submission Form Container */}
          <motion.div
            ref={formRef}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 luxury-card rounded-3xl p-8 md:p-9 bg-gradient-to-b from-white to-rose-50/25 border-rose-100"
          >
            <h3 className="text-xl font-extrabold text-slate-900 mb-2">
              ثبت پیام تبریک جدید
            </h3>
            <p className="text-xs text-slate-600 mb-7 leading-relaxed">
              پیام و استیکر انتخابی شما بلافاصله روی دیوار یادگاری آقای اکبر زاده نمایش داده می‌شود.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label
                  htmlFor="sender-name"
                  className="block text-xs font-bold text-slate-800 mb-2"
                >
                  نام و نام خانوادگی شما <span className="text-rose-500">*</span>
                </label>
                <input
                  id="sender-name"
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="مثلاً: علی رضایی"
                  className="w-full px-4 py-3 text-sm rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="sender-role"
                  className="block text-xs font-bold text-slate-800 mb-2"
                >
                  واحد سازمانی یا عنوان شغلی (اختیاری)
                </label>
                <input
                  id="sender-role"
                  type="text"
                  value={senderRole}
                  onChange={(e) => setSenderRole(e.target.value)}
                  placeholder="مثلاً: تیم فنی، واحد محصول، همکار قدیمی..."
                  className="w-full px-4 py-3 text-sm rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
                />
              </div>

              {/* Sticker Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  انتخاب استیکر و نشان پیام
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {STICKER_OPTIONS.map((item) => {
                    const active = selectedSticker === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedSticker(item.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all duration-200 cursor-pointer ${
                          active
                            ? 'bg-rose-50 border-rose-400 text-slate-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {renderStickerIcon(item.id, 'w-4 h-4 shrink-0')}
                        <span className="text-xs font-bold truncate whitespace-nowrap">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Template Helper */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="wish-message"
                    className="block text-xs font-bold text-slate-800"
                  >
                    متن پیام تبریک یا خاطره <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    پیشنهاد آماده:
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {QUICK_TEMPLATES.map((tpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMessage(tpl)}
                      className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      متن پیشنهادی {(idx + 1).toLocaleString('fa-IR')}
                    </button>
                  ))}
                </div>

                <textarea
                  id="wish-message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="پیام تبریک، آرزوی خوب یا خاطره کاری خود با آقای اکبر زاده را بنویسید..."
                  className="w-full px-4 py-3 text-sm rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all leading-relaxed resize-none"
                />
              </div>

              {formError && (
                <p className="text-xs text-rose-600 font-bold">{formError}</p>
              )}

              {submitSuccess && (
                <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3.5">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>پیام تبریک شما با موفقیت در دیوار یادگاری آقای اکبر زاده ثبت شد!</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="luxury-gold-button w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 text-sm font-bold rounded-xl disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSubmitting ? 'در حال ثبت یادگاری...' : 'ثبت پیام در دیوار یادگاری'}
                </span>
              </button>
            </form>
          </motion.div>

          {/* Wishes Wall Feed & Controls */}
          <div className="lg:col-span-7 space-y-6">
            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200/80 p-3 rounded-2xl">
              {/* Interactive Segmented Filter Controls */}
              <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setSortMode(WishSortMode.ALL)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                    sortMode === WishSortMode.ALL
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  همه پیام‌ها
                </button>
                <button
                  type="button"
                  onClick={() => setSortMode(WishSortMode.POPULAR)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                    sortMode === WishSortMode.POPULAR
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  محبوب‌ترین‌ها
                </button>
                <button
                  type="button"
                  onClick={() => setSortMode(WishSortMode.RECENT)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                    sortMode === WishSortMode.RECENT
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  جدیدترین‌ها
                </button>
              </div>

              {/* Search Input */}
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در نام همکاران یا متن..."
                  className="w-full pr-10 pl-3.5 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-400 transition-colors"
                />
              </div>
            </div>

            {/* Wishes Cards Grid */}
            {filteredWishes.length === 0 ? (
              <div className="luxury-card rounded-3xl p-14 text-center">
                <p className="text-sm text-slate-600 mb-4">
                  پیامی مطابق با عبارت جستجو شده یافت نشد.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="luxury-outline-button px-5 py-2.5 text-xs font-bold rounded-xl cursor-pointer"
                >
                  نمایش همه یادگاری‌ها
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredWishes.map((wish, idx) => {
                  const isLiked = likedIds.includes(wish.id);
                  return (
                    <motion.article
                      key={wish.id}
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-40px' }}
                      transition={{
                        duration: 0.55,
                        delay: Math.min(idx * 0.05, 0.25),
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="luxury-card luxury-card-interactive rounded-2xl p-6 md:p-7 flex flex-col justify-between bg-white"
                    >
                      <div>
                        {/* Header: Colleague Name + Sticker Icon */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <h4 className="text-base font-extrabold text-slate-900">
                              {wish.senderName}
                            </h4>
                            {/* Zero-Pill Metadata Discipline: Clean unboxed text with · separators */}
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-1">
                              <span>{wish.senderRole}</span>
                              <span aria-hidden="true">·</span>
                              <span>{wish.createdAt}</span>
                              <span aria-hidden="true">·</span>
                              <span className="text-rose-500 font-semibold">
                                {getStickerLabel(wish.sticker)}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedWishModal(wish)}
                            title="مشاهده کارت یادگاری"
                            className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 hover:bg-amber-100 transition-colors cursor-pointer shrink-0"
                          >
                            {renderStickerIcon(wish.sticker, 'w-4 h-4')}
                          </button>
                        </div>

                        {/* Wish Message Body */}
                        <p className="text-sm text-slate-700 leading-[1.85] mt-4 mb-6">
                          «{wish.message}»
                        </p>
                      </div>

                      {/* Card Footer: Like Action + Delete + View Card */}
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onLikeWish(wish.id)}
                            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                              isLiked
                                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                : 'bg-slate-50 text-slate-600 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 border border-slate-200/80'
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>پسندیدم</span>
                            <span className="font-mono-num font-bold">
                              ({wish.likes.toLocaleString('fa-IR')})
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(wish)}
                            disabled={deletingWishId === wish.id}
                            title="حذف پیام"
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedWishModal(wish)}
                          className="text-xs font-semibold text-sky-600 hover:text-rose-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          نمای کارت یادگاری
                        </button>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Commemorative Postcard Modal */}
      {selectedWishModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedWishModal(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg bg-white border-2 border-rose-200 shadow-2xl rounded-3xl p-8 md:p-10 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedWishModal(null)}
              aria-label="بستن"
              className="absolute left-6 top-6 p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3.5 mb-6">
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                {renderStickerIcon(selectedWishModal.sticker, 'w-6 h-6')}
              </div>
              <div>
                <p className="text-xs text-rose-500 font-bold">
                  کارت یادگاری جشن تولد آقای اکبر زاده
                </p>
                <h4 className="text-xl font-extrabold text-slate-900 mt-0.5">
                  از طرف: {selectedWishModal.senderName}
                </h4>
              </div>
            </div>

            <p className="text-base text-slate-800 leading-[2] bg-gradient-to-br from-rose-50/50 via-amber-50/40 to-sky-50/50 border border-rose-100 rounded-2xl p-6 mb-6">
              «{selectedWishModal.message}»
            </p>

            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <div>
                <span>{selectedWishModal.senderRole}</span>
                <span className="mx-2" aria-hidden="true">·</span>
                <span>{selectedWishModal.createdAt}</span>
              </div>

              <button
                type="button"
                onClick={() => onLikeWish(selectedWishModal.id)}
                className="luxury-gold-button inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold cursor-pointer"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>
                  همراهی با این پیام ({selectedWishModal.likes.toLocaleString('fa-IR')})
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleDelete(selectedWishModal)}
                disabled={deletingWishId === selectedWishModal.id}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف پیام</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </section>
  );
};
