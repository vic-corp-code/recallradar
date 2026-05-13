# Tailscale Mobile Testing

This guide covers how to test RecallRadar on a physical mobile device using Tailscale.

## Why Tailscale

The Next.js dev server binds to `localhost` by default, which is not reachable from other devices on the network. Tailscale creates a secure WireGuard mesh network that lets your development machine and phone communicate as if they were on the same LAN, without port forwarding or exposing your dev server to the open network.

## Prerequisites

- Tailscale installed on your development machine and phone
- Both devices logged into the same Tailscale network
- Next.js dev server running (`bun dev`)

## Configuration

### 1. next.config.ts

The config already includes Tailscale domains in the default allowed dev origins:

```ts
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
```

Wildcards cover all `*.ts.net` and `*.tailnet.ts.net` domains automatically.

### 2. .env.local

Set `ALLOWED_DEV_ORIGINS` with the Tailscale hostname or IP of your development machine:

```env
ALLOWED_DEV_ORIGINS=<your-hostname>.ts.net,<your-tailscale-ip>
```

Multiple origins can be comma-separated. These values are merged with the default origins in `next.config.ts`.

The Tailscale hostname follows the pattern `<machine-name>.<tailnet-name>.ts.net`. You can also use the Tailscale IP (usually `100.x.x.x`).

### 3. How ALLOWED_DEV_ORIGINS Works

In `next.config.ts`:

```ts
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
```

Each origin is normalized (protocol stripped, hostname extracted). The values populate Next.js `allowedDevOrigins` and `serverActions.allowedOrigins`, which control which hosts can access dev assets and invoke server actions.

## Usage

### 1. Find your Tailscale hostname

On your dev machine:

```bash
tailscale status
```

Look for your machine's name and note the `*.ts.net` domain or Tailscale IP.

### 2. Update .env.local

```env
ALLOWED_DEV_ORIGINS=<your-hostname>.ts.net
```

Or with multiple:

```env
ALLOWED_DEV_ORIGINS=<your-hostname>.ts.net,100.x.x.x
```

### 3. Restart the dev server

```bash
bun dev
```

You should see output showing that the additional origins are allowed.

### 4. Open on phone

On your phone's browser, navigate to:

```
http://<your-hostname>.ts.net:3000
```

Or using the Tailscale IP:

```
http://100.x.x.x:3000
```

### 5. File upload and camera

- File upload from the gallery works over Tailscale.
- Camera capture (photo of a receipt) also works, since the connection is local to the Tailscale network.

## Troubleshooting

| Symptom                          | Likely cause                                  | Fix                                                |
| -------------------------------- | --------------------------------------------- | -------------------------------------------------- |
| `ERR_CONNECTION_REFUSED` on phone | Dev server not running or wrong hostname/IP   | Verify `bun dev` is running and hostname is correct |
| HMR not working                  | WebSocket origin not allowed                  | Make sure hostname is in `ALLOWED_DEV_ORIGINS`      |
| Server action returns 404        | Origin not in `serverActions.allowedOrigins`  | Check `next.config.ts` merging logic               |
| Slow image upload                | Large file over Tailscale                     | Resize images before upload, or use WiFi direct     |
| Tailscale not connected          | Tailscale not running on one device           | Run `tailscale up` on both devices                  |

## How the dev server is started

```bash
bun dev
```

This runs `next dev`, which reads `next.config.ts` and applies `allowedDevOrigins` and server action origin restrictions.
