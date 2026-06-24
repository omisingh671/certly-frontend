import { API_BASE_URL } from "@/api/client";

const ABSOLUTE_ASSET_PATTERN = /^(https?:|data:|blob:)/i;
const IMAGE_ASSET_PATH_PATTERN = /^uploads\/.+\.(?:jpe?g|png|webp)$/i;
const PDF_ASSET_PATH_PATTERN = /^uploads\/.+\.pdf$/i;

const apiAssetUrl = (path: string): string =>
  `${API_BASE_URL.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

export const resolveAssetUrl = (value: string | null | undefined): string | null => {
  const assetUrl = value?.trim();

  if (!assetUrl) {
    return null;
  }

  if (ABSOLUTE_ASSET_PATTERN.test(assetUrl)) {
    return assetUrl;
  }

  const relativeUrl = assetUrl.startsWith("/") ? assetUrl : `/${assetUrl}`;

  return apiAssetUrl(relativeUrl);
};

export const resolveCanvasAssetUrl = (value: string | null | undefined): string | null => {
  const assetUrl = value?.trim();
  const resolvedUrl = resolveAssetUrl(value);

  if (!assetUrl || !resolvedUrl || /^(data:|blob:)/i.test(assetUrl)) {
    return resolvedUrl;
  }

  if (/^https?:/i.test(assetUrl)) {
    return resolvedUrl;
  }

  try {
    const key = decodeURIComponent(assetUrl).replace(/^\/+/, "");

    if (IMAGE_ASSET_PATH_PATTERN.test(key)) {
      return apiAssetUrl(`/assets/image?key=${encodeURIComponent(key)}`);
    }
  } catch {
    return resolvedUrl;
  }

  return resolvedUrl;
};

export const resolvePdfAssetUrl = (value: string | null | undefined): string | null => {
  const assetUrl = value?.trim();
  const resolvedUrl = resolveAssetUrl(value);

  if (!assetUrl || !resolvedUrl) {
    return resolvedUrl;
  }

  try {
    const path = /^https?:/i.test(assetUrl)
      ? new URL(assetUrl).pathname
      : assetUrl;
    const key = decodeURIComponent(path).replace(/^\/+/, "");

    if (PDF_ASSET_PATH_PATTERN.test(key)) {
      return apiAssetUrl(`/assets/pdf?key=${encodeURIComponent(key)}`);
    }
  } catch {
    return resolvedUrl;
  }

  return resolvedUrl;
};
