const express = require("express");
const multer = require("multer");
const axios = require("axios");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const FormData = require("form-data");
const { exec } = require("child_process");  // Import exec for garbage collection
require("dotenv").config();

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

const PINATA_API_KEY = "b4fb0940751b4a3507c6";
const PINATA_SECRET_API_KEY = "0856f18b69d0d05e37690ca13baad4b62fc9f363b1a98d1b5da3ccf9388bb192";

// Function to unpin file from Pinata and trigger garbage collection
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

// Route to upload file to Pinata
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
    console.log(`✅ File uploaded: ${ipfsHash}`);

    // Schedule unpinning and garbage collection after 10 minutes
    setTimeout(() => unpinAndCleanup(ipfsHash), 10 * 60 * 1000);

    res.json({ ipfsHash });
  } catch (error) {
    console.error("❌ Error uploading to Pinata:", error);
    res.status(500).send("Upload failed");
  }
});

// Route to generate OTP
app.get("/generate-otp", (req, res) => {
  const otp = crypto.randomInt(100000, 999999);
  res.json({ otp });
});

app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
