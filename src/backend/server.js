const express = require("express");
const multer = require("multer");
const axios = require("axios");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const FormData = require("form-data");
require("dotenv").config();

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

const PINATA_API_KEY = "b4fb0940751b4a3507c6";
const PINATA_SECRET_API_KEY = "0856f18b69d0d05e37690ca13baad4b62fc9f363b1a98d1b5da3ccf9388bb192";

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

    res.json({ ipfsHash: response.data.IpfsHash });
  } catch (error) {
    console.error("Error uploading to Pinata:", error);
    res.status(500).send("Upload failed");
  }
});

// Route to generate OTP
app.get("/generate-otp", (req, res) => {
  const otp = crypto.randomInt(100000, 999999);
  res.json({ otp });
});

app.listen(port, () => console.log(`Server running on port ${port}`));
