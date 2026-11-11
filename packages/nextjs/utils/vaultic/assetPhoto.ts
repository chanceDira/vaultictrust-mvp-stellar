export const MAX_ASSET_PHOTO_BYTES = 1_200_000;

export const ASSET_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type AssetPhotoMime = (typeof ASSET_PHOTO_MIME_TYPES)[number];

export function isAssetPhotoMime(value: string): value is AssetPhotoMime {
  return (ASSET_PHOTO_MIME_TYPES as readonly string[]).includes(value);
}
