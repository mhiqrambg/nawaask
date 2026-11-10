import type { ScreenshotAttachment } from "@/modules/ai/types";

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image"));
    reader.readAsDataURL(blob);
  });
}

function friendlyError(error: unknown): Error {
  const message = error instanceof Error ? error.message : "";
  if (/cannot capture|captureVisibleTab|web store/i.test(message)) {
    return new Error(
      "Chrome can't capture this tab. Switch to a regular webpage and try again.",
    );
  }
  return new Error(message || "Could not capture the current tab.");
}

/**
 * Capture the visible area of the active tab as a downscaled JPEG.
 * Requires the user to click the camera button; never runs on its own.
 */
export async function captureVisibleScreenshot(): Promise<ScreenshotAttachment> {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const tab = tabs[0] ?? (await chrome.tabs.query({ active: true }))[0];
  if (!tab?.windowId) throw new Error("No active tab to capture.");
  if (tab.url && !/^(https?|file):/i.test(tab.url)) {
    throw new Error(
      "Chrome can't capture browser pages. Switch to a regular webpage and try again.",
    );
  }

  let raw: string;
  try {
    raw = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: "jpeg",
      quality: 92,
    });
  } catch (error) {
    throw friendlyError(error);
  }

  let bitmap: ImageBitmap;
  try {
    const blob = await (await fetch(raw)).blob();
    bitmap = await createImageBitmap(blob);
  } catch {
    throw new Error("Could not decode the screenshot.");
  }

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare the screenshot.");
    ctx.drawImage(bitmap, 0, 0, width, height);
    const out = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: JPEG_QUALITY,
    });
    return {
      dataUrl: await blobToDataUrl(out),
      width,
      height,
      title: tab.title ?? "",
      url: tab.url ?? "",
    };
  } finally {
    bitmap.close();
  }
}
