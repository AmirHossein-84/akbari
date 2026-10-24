import { readStore, sendError, writeStore } from '../_store';

interface Request {
  method?: string;
  query: { id?: string };
}

interface Response {
  status: (code: number) => Response;
  json: (body: object) => void;
}

export default async function handler(req: Request, res: Response) {
  const id = req.query.id;
  if (!id) {
    res.status(400).json({ error: 'شناسه پیام نامعتبر است.' });
    return;
  }

  if (req.method !== 'DELETE' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const storeResult = await readStore();
    const index = storeResult.data.wishes.findIndex((wish) => wish.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'پیام مورد نظر یافت نشد.' });
      return;
    }

    if (req.method === 'POST') {
      storeResult.data.wishes[index].likes += 1;
      await writeStore(storeResult.data, storeResult.sha);
      res.json({ wish: storeResult.data.wishes[index] });
      return;
    }

    storeResult.data.wishes.splice(index, 1);
    await writeStore(storeResult.data, storeResult.sha);
    res.json({ wishes: storeResult.data.wishes, celebrationCount: storeResult.data.celebrationCount });
  } catch (error) {
    sendError(res, error);
  }
}
