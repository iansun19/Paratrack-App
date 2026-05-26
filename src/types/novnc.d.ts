// Type shim for @novnc/novnc — the package ships without .d.ts files
declare module "@novnc/novnc/core/rfb.js" {
  export default class RFB {
    constructor(target: HTMLElement, url: string, options?: { credentials?: object });
    scaleViewport: boolean;
    resizeSession: boolean;
    background: string;
    disconnect(): void;
    addEventListener(type: "connect" | "disconnect" | "credentialsrequired" | string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
  }
}
