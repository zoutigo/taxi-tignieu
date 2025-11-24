export const AVATAR_URLS = Array.from({ length: 30 }).map(
  (_, i) => `https://api.dicebear.com/7.x/thumbs/svg?seed=avatar-${i + 1}`
);

export function isValidAvatar(url: string): boolean {
  return AVATAR_URLS.includes(url);
}
