import { MaxUI } from "@maxhub/max-ui";

import { WidgetShell } from "../shell/WidgetShell";
import { WidgetContent } from "./WidgetContent";

import "@maxhub/max-ui/styles.css";

export function WidgetPanel() {
  return (
    <MaxUI colorScheme="light">
      <WidgetShell title="Сообщения" subtitle="WhatsApp · GREEN-API">
        <WidgetContent />
      </WidgetShell>
    </MaxUI>
  );
}
