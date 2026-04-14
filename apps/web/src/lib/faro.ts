import { ReactIntegration } from "@grafana/faro-react";
import { TransportItemType, getWebInstrumentations, initializeFaro } from "@grafana/faro-web-sdk";
import { toast } from "sonner";

import type { Faro } from "@grafana/faro-web-sdk";

const DEDUP_WINDOW_MS = 60_000;
const STACK_PREVIEW_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 120;

export const _recentErrors = new Map<string, number>();

export function _isDuplicate(key: string): boolean {
  const lastSeen = _recentErrors.get(key);
  if (lastSeen !== undefined && Date.now() - lastSeen < DEDUP_WINDOW_MS) {
    return true;
  }
  _recentErrors.set(key, Date.now());
  return false;
}

function dedupeKey(value: string, stack?: string): string {
  return `${value}::${stack?.slice(0, STACK_PREVIEW_LENGTH) ?? ""}`;
}

export function initFaro(url: string, appName: string, appVersion: string): Faro | null {
  if (!url) {
    return null;
  }

  const faro = initializeFaro({
    url,
    app: {
      name: appName,
      version: appVersion,
    },
    instrumentations: [
      ...getWebInstrumentations({
        captureConsole: false,
      }),
      new ReactIntegration(),
    ],
    beforeSend: (item) => {
      if (item.type === TransportItemType.EXCEPTION) {
        const payload = item.payload as { value?: string; stacktrace?: unknown };
        const message = payload.value ?? "An unexpected error occurred";
        const stackStr = payload.stacktrace !== undefined ? String(payload.stacktrace) : undefined;
        const key = dedupeKey(message, stackStr);

        if (!_isDuplicate(key)) {
          const description =
            message.length > DESCRIPTION_MAX_LENGTH
              ? `${message.slice(0, DESCRIPTION_MAX_LENGTH)}...`
              : message;

          toast.error("Something went wrong", { description });
        }
      }
      return item;
    },
  });

  return faro;
}
