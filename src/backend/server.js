const express = require("express");
const multer = require("multer");
const axios = require("axios");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const FormData = require("form-data");
const { exec } = require("child_process");
const { OtpStore, createRedisClient } = require("./otpStore");
require("dotenv").config();

const app = express();
const port = Number(process.env.PORT || 5000);
const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS || 300);
const MAX_UPLOAD_SIZE_MB = Number(process.env.MAX_UPLOAD_SIZE_MB || 10);
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/octet-stream",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf"
]);

const requiredSecrets = ["PINATA_API_KEY", "PINATA_SECRET_API_KEY"];
const missingSecrets = requiredSecrets.filter((name) => !process.env[name]);
if (missingSecrets.length > 0) {
  throw new Error(`Missing required env vars: ${missingSecrets.join(", ")}`);
}

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;

const log = (level, event, data = {}) => {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...data
  };
  console.log(JSON.stringify(payload));
};

app.use(cors());
app.use(express.json());

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  }
});

let otpStore;

const unpinAndCleanup = async (cid) => {
  try {
    await axios.delete(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY,
      },
    });

    log("info", "pinata.unpinned", { cid });

    exec("ipfs repo gc", (error, stdout) => {
      if (error) {
        log("warn", "ipfs.gc_failed", { error: error.message });
        return;
      }
      log("info", "ipfs.gc_completed", { output: stdout.trim() });
    });
  } catch (error) {
    log("error", "pinata.unpin_failed", { cid, error: error.message });
  }
};

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    log("info", "upload.received", {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    const data = new FormData();
    data.append("file", fs.createReadStream(file.path));

    const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", data, {
      headers: {
        "Content-Type": `multipart/form-data; boundary=${data._boundary}`,
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY,
      },
    });

    fs.unlinkSync(file.path);

    const ipfsHash = response.data.IpfsHash;
    log("info", "upload.pinned", { ipfsHash });

    setTimeout(() => unpinAndCleanup(ipfsHash), 10 * 60 * 1000);

    res.json({ ipfsHash });
  } catch (error) {
    log("error", "upload.failed", { error: error.message });
    res.status(500).json({ error: "Upload failed" });
  }
});

app.post("/generate-otp", async (req, res) => {
  const { recipient, ipfsHash } = req.body;

  if (!recipient || !ipfsHash) {
    return res.status(400).json({ error: "Recipient address and IPFS hash required" });
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(String(recipient))) {
    return res.status(400).json({ error: "Invalid recipient wallet address" });
  }

  try {
    const otp = crypto.randomInt(100000, 999999);
    await otpStore.setOtp(recipient, otp, ipfsHash);

    log("info", "otp.generated", {
      recipient,
      ipfsHash,
      ttlSeconds: OTP_TTL_SECONDS
    });

    res.json({ otp });
  } catch (error) {
    log("error", "otp.generate_failed", { recipient, error: error.message });
    res.status(500).json({ error: "Failed to generate OTP" });
  }
});

app.post("/verify-otp", async (req, res) => {
  const { recipient, otp } = req.body;

  if (!recipient || !otp) {
    return res.status(400).json({ error: "Recipient address and OTP required" });
  }

  if (!/^\d{6}$/.test(String(otp))) {
    return res.status(400).json({ error: "OTP must be a 6-digit code" });
  }

  try {
    const result = await otpStore.consumeOtp(recipient, otp);
    if (!result) {
      log("warn", "otp.invalid", { recipient });
      return res.status(401).json({ error: "Invalid or expired OTP" });
    }

    log("info", "otp.verified", { recipient, ipfsHash: result.ipfsHash });
    res.json({ ipfsHash: result.ipfsHash });
  } catch (error) {
    log("error", "otp.verify_failed", { recipient, error: error.message });
    res.status(500).json({ error: "Failed to verify OTP" });
  }
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: `File too large. Max allowed size is ${MAX_UPLOAD_SIZE_MB}MB`
      });
    }
    return res.status(400).json({ error: error.message });
  }

  if (error.message && error.message.startsWith("Unsupported file type")) {
    return res.status(400).json({
      error: `${error.message}. Allowed types: ${Array.from(ALLOWED_MIME_TYPES).join(", ")}`
    });
  }

  log("error", "server.unhandled_error", { error: error.message });
  res.status(500).json({ error: "Internal server error" });
});

async function startServer() {
  const redisClient = await createRedisClient(process.env.REDIS_URL, log);
  otpStore = new OtpStore({ redisClient, ttlSeconds: OTP_TTL_SECONDS, logger: log });

  app.listen(port, () => {
    log("info", "server.started", {
      port,
      otpTtlSeconds: OTP_TTL_SECONDS,
      maxUploadSizeMb: MAX_UPLOAD_SIZE_MB
    });
  });
}

startServer().catch((error) => {
  log("error", "server.start_failed", { error: error.message });
  process.exit(1);
});
