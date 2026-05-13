import type { NextConfig } from "next";

const defaultAllowedDevOrigins = [
  "localhost",
  "127.0.0.1",
  "*.local",
  "*.localdomain",
  "*.ts.net",
  "**.ts.net",
  "*.tailnet.ts.net",
  "**.tailnet.ts.net",
];

const devServerPort = process.env.PORT ?? "3000";

const normalizeAllowedOrigin = (value: string) => {
  const withProtocol = value.includes("://") ? value : `http://${value}`;

  try {
    const url = new URL(withProtocol);
    return {
      host: url.host,
      hostname: url.hostname,
    };
  } catch {
    return {
      host: value,
      hostname: value.replace(/:\d+$/, ""),
    };
  }
};

const envAllowedOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
  .map(normalizeAllowedOrigin);

const allowedDevOrigins = Array.from(
  new Set([
    ...defaultAllowedDevOrigins,
    ...envAllowedOrigins.map(({ hostname }) => hostname),
  ]),
);

const allowedServerActionOrigins = Array.from(
  new Set([
    ...allowedDevOrigins,
    ...allowedDevOrigins.map((origin) =>
      origin.includes(":") ? origin : `${origin}:${devServerPort}`,
    ),
    ...envAllowedOrigins.map(({ host }) => host),
  ]),
);

const nextConfig: NextConfig = {
  allowedDevOrigins,
  experimental: {
    serverActions: {
      allowedOrigins: allowedServerActionOrigins,
    },
  },
  async headers() {
    return [
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
