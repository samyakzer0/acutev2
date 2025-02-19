const express = require("express");
const multer = require("multer");
const axios = require("axios");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const FormData = require("form-data");
const { exec } = require("child_process");  // For garbage collection
require("dotenv").config();

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

const PINATA_API_KEY = "b4fb0940751b4a3507c6";
const PINATA_SECRET_API_KEY = "0856f18b69d0d05e37690ca13baad4b62fc9f363b1a98d1b5da3ccf9388bb192";

// Store OTPs temporarily (in-memory storage)
let otpStore = {};

// 🗑️ Function to unpin file from Pinata & trigger garbage collection
const unpinAndCleanup = async (cid) => {
  try {
    // Unpin from Pinata
    await axios.delete(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY,
      },
    });

    console.log(`🗑️ File unpinned from IPFS: ${cid}`);

    // Trigger IPFS garbage collection (local node)
    exec("ipfs repo gc", (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Error running IPFS garbage collection:", error);
        return;
      }
      console.log("♻️ IPFS Garbage Collection Completed:", stdout);
    });

  } catch (error) {
    console.error("❌ Error unpinning file or cleaning up:", error);
  }
};

// 📤 Route to upload **encrypted** file to Pinata
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).send("No file uploaded");

    const data = new FormData();
    data.append("file", fs.createReadStream(file.path));

    const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", data, {
      headers: {
        "Content-Type": `multipart/form-data; boundary=${data._boundary}`,
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY,
      },
    });

    // Remove the local file after upload
    fs.unlinkSync(file.path);

    const ipfsHash = response.data.IpfsHash;
    console.log(`✅ Encrypted file uploaded: ${ipfsHash}`);

    // Schedule unpinning & garbage collection after 10 minutes
    setTimeout(() => unpinAndCleanup(ipfsHash), 10 * 60 * 1000);

    res.json({ ipfsHash });
  } catch (error) {
    console.error("❌ Error uploading to Pinata:", error);
    res.status(500).send("Upload failed");
  }
});

// 🔑 Route to generate OTP and associate it with a recipient
app.get("/generate-otp", (req, res) => {
  const { recipient, ipfsHash } = req.body;

  if (!recipient || !ipfsHash) {
    return res.status(400).send("Recipient address and IPFS hash required");
  }

  const otp = crypto.randomInt(100000, 999999);
  otpStore[recipient] = { otp, ipfsHash };

  console.log(`🔐 OTP generated: ${otp} for recipient ${recipient}`);

  res.json({ otp });
});

// 🔍 Route to verify OTP and return associated IPFS hash
app.post("/verify-otp", (req, res) => {
  const { recipient, otp } = req.body;

  if (!recipient || !otp) {
    return res.status(400).send("Recipient address and OTP required");
  }

  if (otpStore[recipient] && otpStore[recipient].otp == otp) {
    const ipfsHash = otpStore[recipient].ipfsHash;
    delete otpStore[recipient]; // Remove OTP after use
    console.log(`✅ OTP verified! Returning IPFS hash: ${ipfsHash}`);
    res.json({ ipfsHash });
  } else {
    res.status(401).send("Invalid OTP");
  }
});

app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
