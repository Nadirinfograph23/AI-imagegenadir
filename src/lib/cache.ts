import crypto from 'crypto';

interface CacheEntry {
  images: string[];
  provider: string;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 50;

export function generateCacheKey(prompt: string, image?: string): string {
  const data = prompt + (image ? image.substring(0, 100) : '');
  return crypto.createHash('md5').update(data).digest('hex');
}

export function getCachedResult(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return entry;
}

export function setCachedResult(
  key: string,
  images: string[],
  provider: string
): void {
  // Evict oldest entries if cache is full
  if (cache.size >= MAX_CACHE_SIZE) {
    let oldestKey = '';
    let oldestTime = Infinity;
    for (const [k, v] of cache.entries()) {
      if (v.timestamp < oldestTime) {
        oldestTime = v.timestamp;
        oldestKey = k;
      }
    }
    if (oldestKey) cache.delete(oldestKey);
  }

  cache.set(key, {
    images,
    provider,
    timestamp: Date.now(),
  });
}
