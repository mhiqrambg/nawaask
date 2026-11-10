import type { ChatMessage } from "@/modules/ai/types";

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  providerId: string;
  modelId: string;
  messages: ChatMessage[];
  pageContext?: string;
  selectionContext?: string;
  selectionAction?: string;
}

export interface ConversationMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  providerId: string;
  modelId: string;
  messageCount: number;
}

const DB_NAME = "nawaask";
const DB_VERSION = 1;
const STORE = "conversations";

function openDatabase(): Promise<IDBDatabase> {
  const { promise, resolve, reject } = Promise.withResolvers<IDBDatabase>();
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE)) {
      const store = db.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("updatedAt", "updatedAt");
      store.createIndex("pinned", "pinned");
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
  return promise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  const { promise, resolve, reject } = Promise.withResolvers<T>();
  const tx = db.transaction(STORE, mode);
  const req = fn(tx.objectStore(STORE));
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
  tx.oncomplete = () => db.close();
  return promise;
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  return withStore<Conversation | undefined>("readonly", (s) => s.get(id));
}

export async function putConversation(conv: Conversation): Promise<void> {
  await withStore("readwrite", (s) => s.put(conv));
}

export async function deleteConversation(id: string): Promise<void> {
  await withStore("readwrite", (s) => s.delete(id));
}

export async function clearConversations(): Promise<void> {
  await withStore("readwrite", (s) => s.clear());
}

export async function listConversations(): Promise<ConversationMeta[]> {
  const db = await openDatabase();
  const { promise, resolve, reject } = Promise.withResolvers<ConversationMeta[]>();
  const tx = db.transaction(STORE, "readonly");
  const store = tx.objectStore(STORE);
  const req = store.getAll();
  req.onsuccess = () => {
    const rows = (req.result ?? []) as Conversation[];
    const metas = rows
      .map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        pinned: c.pinned,
        providerId: c.providerId,
        modelId: c.modelId,
        messageCount: c.messages.length,
      }))
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      });
    resolve(metas);
  };
  req.onerror = () => reject(req.error);
  tx.oncomplete = () => db.close();
  return promise;
}

export function newConversation(providerId: string, modelId: string): Conversation {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "New Chat",
    createdAt: now,
    updatedAt: now,
    pinned: false,
    providerId,
    modelId,
    messages: [],
  };
}

export function deriveTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New Chat";
  const text = first.content.trim().replace(/\s+/g, " ");
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

export function exportConversationMarkdown(conv: Conversation): string {
  const lines: string[] = [`# ${conv.title}`, "", `- Provider: ${conv.providerId}`, `- Model: ${conv.modelId}`, ""];
  if (conv.pageContext) lines.push(`> Page context: ${conv.pageContext.slice(0, 200)}…`, "");
  for (const m of conv.messages) {
    lines.push(`## ${m.role === "user" ? "You" : "NawaAsk"}`, "", m.content, "");
  }
  return lines.join("\n");
}

export function exportConversationText(conv: Conversation): string {
  const lines: string[] = [conv.title, `Provider: ${conv.providerId} | Model: ${conv.modelId}`, ""];
  for (const m of conv.messages) {
    lines.push(`${m.role === "user" ? "You" : "NawaAsk"}:`, m.content, "");
  }
  return lines.join("\n");
}
