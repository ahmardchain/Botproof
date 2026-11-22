// Tiny key/value store. On Vercel each request may hit a fresh instance, so state
// that must survive between updates (conversation step, group orders, votes) goes
// to Upstash Redis over its REST API when configured. Locally (long polling) the
// in-memory store is enough.

export interface Store {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

export class MemoryStore implements Store {
  private map = new Map<string, { v: unknown; exp?: number }>();
  async get<T>(key: string) {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (e.exp && e.exp < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return e.v as T;
  }
  async set<T>(key: string, value: T, ttlSeconds?: number) {
    this.map.set(key, { v: value, exp: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined });
  }
  async del(key: string) {
    this.map.delete(key);
  }
}

export class UpstashStore implements Store {
  constructor(private url: string, private token: string) {}
  private async cmd(args: (string | number)[]): Promise<unknown> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    if (!res.ok) throw new Error(`store ${args[0]} failed: HTTP ${res.status}`);
    const body = (await res.json()) as { result?: unknown; error?: string };
    if (body.error) throw new Error(`store ${args[0]} failed: ${body.error}`);
    return body.result;
  }
  async get<T>(key: string) {
    const raw = await this.cmd(["GET", key]);
    return raw == null ? undefined : (JSON.parse(String(raw)) as T);
  }
  async set<T>(key: string, value: T, ttlSeconds?: number) {
    const args: (string | number)[] = ["SET", key, JSON.stringify(value)];
    if (ttlSeconds) args.push("EX", ttlSeconds);
    await this.cmd(args);
  }
  async del(key: string) {
    await this.cmd(["DEL", key]);
  }
}

export function storeFromEnv(env: NodeJS.ProcessEnv = process.env): Store {
  // Vercel's Upstash integration exposes KV_REST_API_*; plain Upstash uses UPSTASH_REDIS_REST_*.
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return new UpstashStore(url, token);
  return new MemoryStore();
}
