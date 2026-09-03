export const DEV_LOGIN = process.env.NEXT_PUBLIC_DEV_LOGIN === "true";

export const DEV_SESSION_CODE = "FLOOR-TEST";

export const DEV_ACCOUNTS = [
  {
    role: "dm" as const,
    email: "dm@crawler.local",
    password: "crawleros",
    label: "Dungeon Master",
  },
  {
    role: "crawler" as const,
    email: "crawler1@crawler.local",
    password: "crawleros",
    label: "Crawler 1",
  },
  {
    role: "crawler" as const,
    email: "crawler2@crawler.local",
    password: "crawleros",
    label: "Crawler 2",
  },
];
