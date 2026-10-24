import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface StoredWish {
  id: string;
  senderName: string;
  senderRole: string;
  message: string;
  sticker: 'crown' | 'sparkles' | 'cake' | 'heart' | 'rocket' | 'trophy';
  likes: number;
  createdAt: string;
}

interface StoreData {
  celebrationCount: number;
  wishes: StoredWish[];
}

const DATA_FILE = path.join(__dirname, 'wishes-store.json');

const INITIAL_DATA: StoreData = {
  celebrationCount: 48,
  wishes: [
    {
      id: 'wish-1',
      senderName: 'سارا محمدی',
      senderRole: 'تیم محصول و طراحی',
      message:
        'آقای اکبری عزیز، تولدتون هزاران بار مبارک! حضور گرم، آرامش مثال‌زدنی و تجربه‌ای که همیشه بی‌دریغ در اختیار بچه‌های تیم می‌گذارید، کار کردن کنار شما رو به یکی از بهترین بخش‌های شرکت تبدیل کرده. براتون سالی پر از سلامتی و موفقیت‌های بزرگ آرزو می‌کنم.',
      sticker: 'crown',
      likes: 24,
      createdAt: '۱ ساعت پیش',
    },
    {
      id: 'wish-2',
      senderName: 'امیرحسین رضایی',
      senderRole: 'تیم فنی و مهندسی',
      message:
        'زادروزتون فرخنده آقای اکبری! هر وقت پروژه به چالش سختی خورده، یک مشورت کوتاه با شما کافی بوده تا بهترین راه‌حل پیدا بشه. واقعاً ستون اصلی تیم ما هستید. امیدوارم همیشه لبتون خندون و دلتون شاد باشه.',
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
        'آقای اکبری گرامی، تولدتون مبارک! داشتن همکاری به باصلابتی و خوش‌فکری شما یک امتیاز بزرگ برای کل مجموعه‌ست. همیشه سلامت، پرانرژی و برقرار باشید.',
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
        'آقای اکبری عزیز، تولدتون کلی مبارک باشه! به امید سال‌های طولانی همکاری کنار هم و جشن گرفتن موفقیت‌های بیشتر در کنار شما.',
      sticker: 'cake',
      likes: 12,
      createdAt: '۶ ساعت پیش',
    },
  ],
};

let memoryStore: StoreData = structuredClone(INITIAL_DATA);

function loadStore(): StoreData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as StoreData;
      if (parsed && Array.isArray(parsed.wishes)) {
        memoryStore = parsed;
        return memoryStore;
      }
    } else {
      fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
    }
  } catch {
    // Fallback to in-memory store if disk write is restricted
  }
  return memoryStore;
}

function saveStore(data: StoreData): void {
  memoryStore = data;
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // Ignore write error in read-only environments
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  loadStore();

  app.get('/api/wishes', (_req, res) => {
    const store = loadStore();
    res.json(store);
  });

  app.post('/api/wishes', (req, res) => {
    const { senderName, senderRole, message, sticker } = req.body || {};

    if (!senderName || typeof senderName !== 'string' || !senderName.trim()) {
      res.status(400).json({ error: 'لطفاً نام خود را وارد کنید.' });
      return;
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'لطفاً متن پیام تبریک را بنویسید.' });
      return;
    }

    const validStickers = ['crown', 'sparkles', 'cake', 'heart', 'rocket', 'trophy'];
    const chosenSticker = validStickers.includes(sticker) ? sticker : 'sparkles';

    const store = loadStore();
    const newWish: StoredWish = {
      id: `wish-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      senderName: senderName.trim().slice(0, 60),
      senderRole:
        senderRole && typeof senderRole === 'string' && senderRole.trim()
          ? senderRole.trim().slice(0, 60)
          : 'همکار تیم',
      message: message.trim().slice(0, 600),
      sticker: chosenSticker,
      likes: 1,
      createdAt: 'لحظاتی پیش',
    };

    store.wishes.unshift(newWish);
    store.celebrationCount += 1;
    saveStore(store);

    res.status(201).json({ wish: newWish, celebrationCount: store.celebrationCount });
  });

  app.post('/api/wishes/:id/like', (req, res) => {
    const { id } = req.params;
    const store = loadStore();
    const target = store.wishes.find((w) => w.id === id);

    if (!target) {
      res.status(404).json({ error: 'پیام مورد نظر یافت نشد.' });
      return;
    }

    target.likes += 1;
    saveStore(store);
    res.json({ wish: target });
  });

  app.post('/api/ceremony/celebrate', (_req, res) => {
    const store = loadStore();
    store.celebrationCount += 1;
    saveStore(store);
    res.json({ celebrationCount: store.celebrationCount });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Birthday celebration server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
