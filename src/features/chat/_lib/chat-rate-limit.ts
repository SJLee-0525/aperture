type ChatRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type ChatRateLimiter = (request: Request) => ChatRateLimitResult | Promise<ChatRateLimitResult>;

type RateLimitOptions = {
  limit: number;
  windowMs: number;
  maxEntries: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type UpstashRateLimitOptions = Pick<RateLimitOptions, "limit" | "windowMs"> & {
  url: string;
  token: string;
  timeoutMs: number;
  fetcher: typeof fetch;
  fallback: ChatRateLimiter;
};

type ChatRateLimitEnvironment = {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  KV_REST_API_URL?: string;
  KV_REST_API_TOKEN?: string;
};

class ChatRateLimitConfigurationError extends Error {
  constructor() {
    super("Shared chat rate limiter configuration is invalid");
    this.name = "ChatRateLimitConfigurationError";
  }
}

const DEFAULT_OPTIONS: RateLimitOptions = {
  limit: 6,
  windowMs: 60_000,
  maxEntries: 500,
};

const UPSTASH_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return { count, ttl }
`;

const clientKey = (request: Request): string => {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
  return address.slice(0, 128);
};

const createChatRateLimiter = (options: Partial<RateLimitOptions> = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const entries = new Map<string, RateLimitEntry>();

  return (request: Request, now = Date.now()): ChatRateLimitResult => {
    for (const [key, entry] of entries) {
      if (entry.resetAt <= now) entries.delete(key);
    }

    const key = clientKey(request);
    const current = entries.get(key);
    if (!current) {
      if (entries.size >= config.maxEntries) {
        const oldestKey = entries.keys().next().value as string | undefined;
        if (oldestKey) entries.delete(oldestKey);
      }
      entries.set(key, { count: 1, resetAt: now + config.windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (current.count >= config.limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
      };
    }

    current.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  };
};

const hashClientKey = async (request: Request): Promise<string> => {
  const bytes = new TextEncoder().encode(clientKey(request));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const createUpstashChatRateLimiter = (options: Partial<UpstashRateLimitOptions> = {}) => {
  const config: UpstashRateLimitOptions = {
    limit: options.limit ?? DEFAULT_OPTIONS.limit,
    windowMs: options.windowMs ?? DEFAULT_OPTIONS.windowMs,
    url: options.url ?? "",
    token: options.token ?? "",
    timeoutMs: options.timeoutMs ?? 1_000,
    fetcher: options.fetcher ?? fetch,
    fallback: options.fallback ?? createChatRateLimiter(),
  };

  const limiter: ChatRateLimiter = async (request) => {
    let response: Response;
    try {
      const identifier = await hashClientKey(request);
      const key = `chat:rate:v1:${identifier}`;
      response = await config.fetcher(config.url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(["EVAL", UPSTASH_SCRIPT, 1, key, config.windowMs]),
        signal: AbortSignal.timeout(config.timeoutMs),
        cache: "no-store",
      });
    } catch {
      return config.fallback(request);
    }

    if (response.status >= 400 && response.status < 500) {
      throw new ChatRateLimitConfigurationError();
    }

    try {
      const payload = (await response.json()) as { result?: unknown; error?: unknown };
      if (!response.ok || payload.error || !Array.isArray(payload.result)) throw new Error();

      const count = Number(payload.result[0]);
      const ttlMs = Number(payload.result[1]);
      if (!Number.isFinite(count) || !Number.isFinite(ttlMs)) throw new Error();
      if (count <= config.limit) return { allowed: true, retryAfterSeconds: 0 };

      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil(Math.max(ttlMs, 0) / 1_000)),
      };
    } catch {
      return config.fallback(request);
    }
  };

  return limiter;
};

const createConfiguredChatRateLimiter = (
  env: ChatRateLimitEnvironment = {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
  },
  options: Partial<UpstashRateLimitOptions> = {},
): ChatRateLimiter => {
  const upstash = {
    url: env.UPSTASH_REDIS_REST_URL?.trim(),
    token: env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  };
  const marketplace = {
    url: env.KV_REST_API_URL?.trim(),
    token: env.KV_REST_API_TOKEN?.trim(),
  };
  const credentials =
    upstash.url && upstash.token
      ? upstash
      : marketplace.url && marketplace.token
        ? marketplace
        : null;
  if (!credentials) return createChatRateLimiter();
  const { url, token } = credentials;
  return createUpstashChatRateLimiter({ ...options, url, token });
};

const chatRateLimiter = createConfiguredChatRateLimiter();

export {
  ChatRateLimitConfigurationError,
  chatRateLimiter,
  createChatRateLimiter,
  createConfiguredChatRateLimiter,
  createUpstashChatRateLimiter,
};
export type { ChatRateLimiter };
