import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { ethers } from "ethers";
import CryptoJS from "crypto-js";
import { Upload, Send, Loader } from "lucide-react";
import PhotoZappABI from "./artifacts/PhotoTransfer.json";

const CONTRACT_ADDRESS = "0x444CE1A913DEDBAEE39eD59B77B3D7D5De6b7452";

export default function SendPhotoPage() {
  const [recipient, setRecipient] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [ipfsHash, setIpfsHash] = useState("");
  const [otp, setOtp] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState("");
  const [fileType, setFileType] = useState(""); // ✅ Store original file type
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    setSelectedFile(file);
    setFileType(file.type); // ✅ Store file type

    if (file.type.startsWith("image")) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
  });

  // 🔐 Encrypt the file as raw binary data
  const encryptFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = () => {
        const key = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
        const wordArray = CryptoJS.lib.WordArray.create(reader.result);
        const encryptedData = CryptoJS.AES.encrypt(wordArray, key).toString();
        setEncryptionKey(key);

        const payload = JSON.stringify({
          encryptedData: encryptedData,
          fileType: file.type, // ✅ Store the file type
        });

        resolve({ encryptedData: btoa(payload), key });
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // ⬆️ Upload encrypted file to IPFS
  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file first.");
      return;
    }

    try {
      setLoading(true);

      // Encrypt the file
      const { encryptedData, key } = await encryptFile(selectedFile);
      setEncryptionKey(key);
      console.log("🔐 Encryption Key Generated:", key);

      const formData = new FormData();
      formData.append("file", new Blob([encryptedData], { type: "application/octet-stream" }));

      const response = await axios.post("https://acutev2.onrender.com/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setIpfsHash(response.data.ipfsHash);
      console.log("✅ File Uploaded! IPFS Hash:", response.data.ipfsHash);
      alert(`File uploaded! IPFS Hash: ${response.data.ipfsHash}`);

    } catch (error) {
      console.error("❌ Upload failed:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 📤 Send transaction to blockchain
  const sendPhoto = async () => {
    if (!ipfsHash || !recipient || !encryptionKey) {
      alert("Upload a file and enter a recipient address first!");
      return;
    }

    try {
      setLoading(true);

      // Generate OTP
      console.log("📢 Requesting OTP...");
      const otpResponse = await axios.post("https://acutev2.onrender.com/generate-otp", {
        recipient,
        ipfsHash
      });
      const generatedOtp = otpResponse.data.otp;
      setOtp(generatedOtp);
      console.log("🔑 Generated OTP:", generatedOtp);

      if (!window.ethereum) {
        alert("MetaMask not detected! Please install MetaMask.");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, PhotoZappABI, signer);

      // 🔑 Encrypt key before sending to smart contract
      const encryptedKey = CryptoJS.AES.encrypt(encryptionKey, recipient).toString();
      console.log("🔐 Encrypted Key Before Sending:", encryptedKey);

      console.log("🚀 Sending transaction...");
      const tx = await contract.sendFile(
        recipient, 
        ipfsHash, 
        encryptedKey, 
        String(generatedOtp)
      );
      await tx.wait(); // Wait for confirmation

      console.log("✅ Transaction successful:", tx);
      alert(`File sent successfully! Transaction Hash: ${tx.hash}`);

    } catch (error) {
      console.error("❌ Transaction failed:", error);
      alert("Failed to send photo. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="form-container glass-effect">
        <h2 className="section-title">Send File!</h2>

        <div {...getRootProps()} className="dropzone">
          <input {...getInputProps()} />
          {preview ? (
            <div className="preview-container">
              <img src={preview} alt="Preview" className="file-preview" />
            </div>
          ) : (
            <div className="dropzone-content">
              <Upload size={48} />
              <p>Drag & drop your file here or click to browse</p>
            </div>
          )}
        </div>

        <button className="action-button upload-button" onClick={handleUpload} disabled={!selectedFile || loading}>
          {loading ? <Loader className="spin" /> : <Upload size={20} />}
          <span>{loading ? "Uploading..." : "Upload to IPFS"}</span>
        </button>

        {ipfsHash && (
          <div className="info-box glass-effect">
            <p className="label">IPFS Hash:</p>
            <p className="value">{ipfsHash}</p>
          </div>
        )}

        <input
          type="text"
          className="text-input glass-effect"
          placeholder="Recipient Address (0x...)"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />

        <button className="action-button send-button" onClick={sendPhoto} disabled={!ipfsHash || !recipient || loading}>
          {loading ? <Loader className="spin" /> : <Send size={20} />}
          <span>{loading ? "Processing..." : "Send File"}</span>
        </button>

        {otp && (
          <div className="info-box glass-effect success">
            <p className="label">Generated OTP:</p>
            <p className="value">{otp}</p>
            <p className="hint">Share this OTP with the recipient</p>
          </div>
        )}
      </div>
    </div>
  );
}
