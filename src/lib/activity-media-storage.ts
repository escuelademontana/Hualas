import { readFile } from 'node:fs/promises';
import path from 'node:path';

const publicRoot = path.resolve(process.cwd(), 'public');

export function isStaticActivityAsset(url: string) {
  return url.startsWith('/activity-images/');
}

export function staticActivityAssetPath(url: string) {
  if (!isStaticActivityAsset(url)) return null;

  const candidate = path.resolve(publicRoot, url.slice(1));
  const relative = path.relative(publicRoot, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;

  return candidate;
}

export function contentTypeForActivityAsset(url: string) {
  const extension = path.extname(url).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.mov': 'video/quicktime',
    '.mp4': 'video/mp4',
    '.png': 'image/png',
    '.webm': 'video/webm',
  };

  return contentTypes[extension] ?? 'application/octet-stream';
}

export async function readStaticActivityAsset(url: string) {
  const filePath = staticActivityAssetPath(url);
  if (!filePath) return null;

  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}
