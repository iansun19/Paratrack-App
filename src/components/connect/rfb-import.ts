export type RfbClient = EventTarget & {
  scaleViewport: boolean;
  resizeSession: boolean;
  background: string;
  disconnect: () => void;
  sendKey: (keysym: number, code: string, down?: boolean) => void;
  clipboardPasteFrom: (text: string) => void;
  addEventListener: typeof EventTarget.prototype.addEventListener;
};

export type RfbConstructor = new (
  target: HTMLElement,
  url: string,
  options?: { shared?: boolean },
) => RfbClient;

function unwrapDefaultToConstructor(start: unknown): RfbConstructor {
  let cur: unknown = start;
  for (let i = 0; i < 8; i++) {
    if (typeof cur === "function") return cur as RfbConstructor;
    if (cur !== null && typeof cur === "object" && "default" in cur) {
      cur = (cur as { default: unknown }).default;
      continue;
    }
    break;
  }
  throw new Error(
    `RFB: expected a constructor from @novnc/novnc (after unwrap: ${typeof cur})`,
  );
}

let cached: RfbConstructor | null = null;

export async function getRFB(): Promise<RfbConstructor> {
  if (cached) return cached;
  const mod = await import("@novnc/novnc");
  cached = unwrapDefaultToConstructor(mod);
  return cached;
}
