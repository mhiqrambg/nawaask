import { renderMarkdown } from "@/utils/markdown";
import type { ChatMessage as ChatMessageType } from "@/modules/ai/types";
import MessageActions from "./MessageActions";
import StreamingIndicator from "./StreamingIndicator";

interface Props {
  message: ChatMessageType;
  streaming: boolean;
  onRegenerate: () => void;
}

export default function ChatMessage({ message, streaming: isStreaming, onRegenerate }: Props) {
  const isUser = message.role === "user";
  const showStreaming = !isUser && isStreaming && !message.content;
  const html = !isUser && message.content ? renderMarkdown(message.content) : null;

  return (
    <div
      class={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
      data-role={message.role}
    >
      <div
        class={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
          isUser
            ? "bg-[rgb(var(--color-accent))] text-white"
            : "bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))]"
        } ${message.error ? "border-red-400/60" : ""}`}
      >
        {showStreaming ? (
          <StreamingIndicator />
        ) : isUser ? (
          <p class="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <>
            <div
              class="prose-nawa break-words"
              // Sanitized in renderMarkdown via DOMPurify.
              dangerouslySetInnerHTML={{ __html: html ?? "" }}
            />
            {message.error && (
              <p class="mt-1 text-[12px] text-red-400">{message.error}</p>
            )}
          </>
        )}
      </div>

      {!isUser && !isStreaming && (message.content || message.error) && (
        <MessageActions
          content={message.content}
          onRegenerate={onRegenerate}
        />
      )}
    </div>
  );
}
