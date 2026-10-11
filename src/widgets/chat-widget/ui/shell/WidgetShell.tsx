import { useMediaQuery } from "@/shared/lib/browser/use-media-query";

import { DesktopShell } from "./desktop/DesktopShell";
import { MobileShell } from "./mobile/MobileShell";
import type { ShellProps } from "./types";

export function WidgetShell(props: ShellProps) {
  const mobile = useMediaQuery("(max-width: 640px)");
  return mobile ? <MobileShell {...props} /> : <DesktopShell {...props} />;
}
