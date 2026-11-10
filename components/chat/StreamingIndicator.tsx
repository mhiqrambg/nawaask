import type { FunctionalComponent } from "preact";

const StreamingIndicator: FunctionalComponent = () => (
  <div class="flex items-center gap-1.5" aria-live="polite">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        class="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-60 animate-bounce"
        style={{ animationDelay: `${i * 120}ms` }}
      />
    ))}
  </div>
);

export default StreamingIndicator;
