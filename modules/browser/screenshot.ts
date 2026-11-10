import type { ScreenshotAttachment } from "@/modules/ai/types";
import type {
  RegionSelectedResponse,
  RegionSelection,
} from "@/modules/browser/messaging";

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

/** Long enough to pick a region at leisure, short enough to free a stuck button. */
const SELECTION_TIMEOUT_MS = 5 * 60_000;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image"));
    reader.readAsDataURL(blob);
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Region selection timed out. Try again."));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function connectionError(error: unknown): Error {
  const message = error instanceof Error ? error.message : "";
  if (/Receiving end does not exist|could not establish connection/i.test(message)) {
    return new Error(
      "Region capture isn't available on this page. Reload the page and try again.",
    );
  }
  return new Error(message || "Could not start region capture.");
}

function validRegion(region: RegionSelection | undefined): region is RegionSelection {
  if (!region) return false;
  const numbers = [
    region.x,
    region.y,
    region.width,
    region.height,
    region.viewportWidth,
    region.viewportHeight,
  ];
  return (
    numbers.every((value) => Number.isFinite(value)) &&
    region.width >= 1 &&
    region.height >= 1 &&
    region.viewportWidth >= 1 &&
    region.viewportHeight >= 1
  );
}

/** Ask the content script for the user's drag selection. Null = cancelled. */
async function selectRegion(tabId: number): Promise<RegionSelection | null> {
  let response: RegionSelectedResponse;
  try {
    response = (await withTimeout(
      chrome.tabs.sendMessage(tabId, { type: "START_REGION_CAPTURE" }),
      SELECTION_TIMEOUT_MS,
    )) as RegionSelectedResponse;
  } catch (error) {
    throw connectionError(error);
  }

  if (!response) throw new Error("Region selection ended unexpectedly. Try again.");
  if (!response.ok) return null;
  if (!validRegion(response.region)) {
    throw new Error("The selected region was invalid. Try again.");
  }
  return response.region;
}

/**
 * Drag-select a region on the active tab, then capture and crop it. The
 * content script hides its overlay before resolving, so it never appears in
 * the capture. Requires the camera button click; never runs on its own.
 */
export async function captureRegionScreenshot(): Promise<ScreenshotAttachment | null> {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const tab = tabs[0] ?? (await chrome.tabs.query({ active: true }))[0];
  if (tab?.id === undefined) throw new Error("No active tab to capture.");
  if (tab.url && !/^(https?|file):/i.test(tab.url)) {
    throw new Error(
      "Chrome can't capture browser pages. Switch to a regular webpage and try again.",
    );
  }

  const region = await selectRegion(tab.id);
  if (!region) return null;

  let raw: string;
  try {
    raw = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: "jpeg",
      quality: 92,
    });
  } catch {
    throw new Error(
      "Chrome can't capture this tab. Switch to a regular webpage and try again.",
    );
  }

  let bitmap: ImageBitmap;
  try {
    const blob = await (await fetch(raw)).blob();
    bitmap = await createImageBitmap(blob);
  } catch {
    throw new Error("Could not decode the screenshot.");
  }

  try {
    // captureVisibleTab returns device pixels; the overlay works in CSS pixels.
    const scaleX = bitmap.width / region.viewportWidth;
    const scaleY = bitmap.height / region.viewportHeight;
    const sourceX = Math.max(0, Math.round(region.x * scaleX));
    const sourceY = Math.max(0, Math.round(region.y * scaleY));
    const sourceWidth = Math.max(
      1,
      Math.min(bitmap.width - sourceX, Math.round(region.width * scaleX)),
    );
    const sourceHeight = Math.max(
      1,
      Math.min(bitmap.height - sourceY, Math.round(region.height * scaleY)),
    );

    const downscale = Math.min(1, MAX_EDGE / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * downscale));
    const height = Math.max(1, Math.round(sourceHeight * downscale));
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare the screenshot.");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      bitmap,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      width,
      height,
    );
    const out = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: JPEG_QUALITY,
    });
    return {
      dataUrl: await blobToDataUrl(out),
      width,
      height,
      title: region.title,
      url: region.url,
    };
  } finally {
    bitmap.close();
  }
}
