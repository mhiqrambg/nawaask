import type { FunctionalComponent } from "preact";
import SidebarHeader from "./SidebarHeader";
import SidebarNavigation from "./SidebarNavigation";

interface Props {
  children: preact.ComponentChildren;
}

const SidebarLayout: FunctionalComponent<Props> = ({ children }) => (
  <div class="flex h-screen w-full flex-col bg-[rgb(var(--color-bg))] text-[rgb(var(--color-fg))]">
    <SidebarHeader />
    <SidebarNavigation />
    <main class="relative flex-1 overflow-hidden">{children}</main>
  </div>
);

export default SidebarLayout;
