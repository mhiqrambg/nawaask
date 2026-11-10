import { render } from "preact";
import "@/assets/styles/global.css";
import { initSettings } from "@/composables/useSettings";
import { initProviders } from "@/composables/useProviders";
import { initPrompts } from "@/composables/usePrompts";
import OptionsApp from "./OptionsApp";

void Promise.all([initSettings(), initProviders(), initPrompts()]).finally(() => {
  render(<OptionsApp />, document.getElementById("root")!);
});
