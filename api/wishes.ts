import { readStore, sendError, StoredWish, StoreData, writeStore } from './_store';

interface Request {
  method?: string;
  body?: {
    senderName?: unknown;
    senderRole?: unknown;
    message?: unknown;
    sticker?: unknown;
  };
}

interface Response {
  status: (code: number) => Response;
  json: (body: object) => void;
}

const validStickers = ['crown', 'sparkles', 'cake', 'heart', 'rocket', 'trophy'] as const;

export default async function handler(req: Request, res: Response) {
  if (req.method === 'GET') {
    try {
      const { data } = await readStore();
      res.json(data);
    } catch (error) {
      sendError(res, error);
    }
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { senderName, senderRole, message, sticker } = req.body || {};
  if (typeof senderName !== 'string' || !senderName.trim()) {
    res.status(400).json({ error: 'لطفاً نام خود را وارد کنید.' });
    return;
  }
  if (typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'لطفاً متن پیام تبریک را بنویسید.' });
    return;
  }

  try {
    const storeResult = await readStore();
    const store: StoreData = storeResult.data;
    const newWish: StoredWish = {
      id: `wish-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      senderName: senderName.trim().slice(0, 60),
      senderRole:
        typeof senderRole === 'string' && senderRole.trim()
          ? senderRole.trim().slice(0, 60)
          : 'همکار تیم',
      message: message.trim().slice(0, 600),
      sticker: validStickers.includes(sticker as (typeof validStickers)[number])
        ? (sticker as StoredWish['sticker'])
        : 'sparkles',
      likes: 1,
      createdAt: 'لحظاتی پیش',
    };

    store.wishes.unshift(newWish);
    store.celebrationCount += 1;
    await writeStore(store, storeResult.sha);
    res.status(201).json({ wish: newWish, celebrationCount: store.celebrationCount });
  } catch (error) {
    sendError(res, error);
  }
}
