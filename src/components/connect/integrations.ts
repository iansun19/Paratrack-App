export type Integration = {
  id: string;
  name: string;
  description: string;
  loginUrl: string;
  avatarLetter: string;
  avatarBg: string;
  avatarFg: string;
};

export const INTEGRATIONS: Integration[] = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Read and manage your emails",
    loginUrl: "https://accounts.google.com/v3/signin/identifier?continue=https%3A%2F%2Fmail.google.com%2Fmail%2F",
    avatarLetter: "M",
    avatarBg: "#EA4335",
    avatarFg: "#FFFFFF",
  },
  {
    id: "outlook",
    name: "Outlook",
    description: "Read and manage your Microsoft emails",
    loginUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    avatarLetter: "O",
    avatarBg: "#0078D4",
    avatarFg: "#FFFFFF",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Access and manage your calendar events",
    loginUrl: "https://accounts.google.com/v3/signin/identifier?continue=https%3A%2F%2Fcalendar.google.com%2Fcalendar%2Fr",
    avatarLetter: "C",
    avatarBg: "#4285F4",
    avatarFg: "#FFFFFF",
  },
  {
    id: "amazon",
    name: "Amazon",
    description: "Track orders and manage your account",
    loginUrl: "https://www.amazon.com/ap/signin",
    avatarLetter: "A",
    avatarBg: "#FF9900",
    avatarFg: "#FFFFFF",
  },
  {
    id: "icloud-photos",
    name: "iCloud Photos",
    description: "Access and manage your iCloud photos",
    loginUrl: "https://www.icloud.com/photos",
    avatarLetter: "i",
    avatarBg: "#3478F6",
    avatarFg: "#FFFFFF",
  },
  {
    id: "canvas",
    name: "Canvas LMS",
    description: "Access school assignments and grades",
    loginUrl: "https://www.google.com",
    avatarLetter: "C",
    avatarBg: "#E66000",
    avatarFg: "#FFFFFF",
  },
  {
    id: "instacart",
    name: "Instacart",
    description: "Order groceries and household supplies",
    loginUrl: "https://www.instacart.com/store/?categoryFilter=homeTabForYou",
    avatarLetter: "I",
    avatarBg: "#43B02A",
    avatarFg: "#FFFFFF",
  },
];

const LS_KEY = "paratrack_connected_integrations";

export function loadConnected(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function saveConnected(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
}
