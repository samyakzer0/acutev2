const crypto = require("crypto");

class OtpStore {
  constructor({ redisClient, ttlSeconds = 300, logger }) {
    this.redisClient = redisClient;
    this.ttlSeconds = ttlSeconds;
    this.logger = logger;
    this.memoryFallback = new Map();
  }

  getKey(recipient) {
    return `otp:${recipient.toLowerCase()}`;
  }

  async setOtp(recipient, otp, ipfsHash) {
    const key = this.getKey(recipient);
    const payload = JSON.stringify({ otp: String(otp), ipfsHash });

    if (this.redisClient) {
      await this.redisClient.set(key, payload, "EX", this.ttlSeconds);
      return;
    }

    const expiresAt = Date.now() + this.ttlSeconds * 1000;
    this.memoryFallback.set(key, { payload, expiresAt });
  }

  async consumeOtp(recipient, otp) {
    const key = this.getKey(recipient);

    if (this.redisClient) {
      const raw = await this.redisClient.get(key);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      if (parsed.otp !== String(otp)) {
        return null;
      }

      await this.redisClient.del(key);
      return parsed;
    }

    const value = this.memoryFallback.get(key);
    if (!value) {
      return null;
    }

    if (Date.now() > value.expiresAt) {
      this.memoryFallback.delete(key);
      return null;
    }

    const parsed = JSON.parse(value.payload);
    if (parsed.otp !== String(otp)) {
      return null;
    }

    this.memoryFallback.delete(key);
    return parsed;
  }
}

async function createRedisClient(redisUrl, logger) {
  if (!redisUrl) {
    logger("warn", "redis.unconfigured", { message: "REDIS_URL missing, using in-memory fallback" });
    return null;
  }

  const Redis = require("ioredis");
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true
  });

  client.on("connect", () => logger("info", "redis.connected", {}));
  client.on("error", (error) => logger("error", "redis.error", { error: error.message }));

  await client.ping();
  return client;
}

module.exports = {
  OtpStore,
  createRedisClient
};
