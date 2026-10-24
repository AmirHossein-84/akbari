export interface StoredWish {
  id: string;
  senderName: string;
  senderRole: string;
  message: string;
  sticker: 'crown' | 'sparkles' | 'cake' | 'heart' | 'rocket' | 'trophy';
  likes: number;
  createdAt: string;
}

export interface StoreData {
  celebrationCount: number;
  wishes: StoredWish[];
}

interface GitHubContentsResponse {
  content?: string;
  sha?: string;
}

const STORE_PATH = 'wishes-store.json';
const repository = process.env.GITHUB_REPOSITORY || 'AmirHossein-84/akbari';
const branch = process.env.GITHUB_BRANCH || 'main';

function githubUrl(): string {
  return `https://api.github.com/repos/${repository}/contents/${STORE_PATH}`;
}

function headers(): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN }
      : {}),
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

export async function readStore(): Promise<{ data: StoreData; sha?: string }> {
  const response = await fetch(`${githubUrl()}?ref=${encodeURIComponent(branch)}`, {
    headers: headers(),
  });

  if (response.status === 404) {
    return { data: { celebrationCount: 48, wishes: [] } };
  }
  if (!response.ok) {
    throw new Error(`GitHub read failed with status ${response.status}`);
  }

  const file = (await response.json()) as GitHubContentsResponse;
  if (!file.content) {
    throw new Error('GitHub store file did not contain content');
  }

  const data = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')) as StoreData;
  if (!data || !Array.isArray(data.wishes) || typeof data.celebrationCount !== 'number') {
    throw new Error('GitHub store file has an invalid shape');
  }

  return { data, sha: file.sha };
}

export async function writeStore(data: StoreData, sha?: string): Promise<void> {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN is not configured');
  }

  const response = await fetch(githubUrl(), {
    method: 'PUT',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Update birthday wishes',
      content: Buffer.from(`${JSON.stringify(data, null, 2)}\n`).toString('base64'),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub write failed with status ${response.status}`);
  }
}

export function sendError(res: { status: (code: number) => { json: (body: object) => void } }, error: unknown) {
  console.error(error);
  res.status(500).json({ error: 'ذخیره‌سازی پیام انجام نشد. لطفاً دوباره تلاش کنید.' });
}
