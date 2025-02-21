import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { ethers } from "ethers";
import CryptoJS from "crypto-js"; // Import CryptoJS for encryption
import { Upload, Send, Loader } from 'lucide-react';
import PhotoZappABI from "./artifacts/PhotoTransfer.json";

const CONTRACT_ADDRESS = "0x444CE1A913DEDBAEE39eD59B77B3D7D5De6b7452";

export default function SendPhotoPage() {
  const [recipient, setRecipient] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [ipfsHash, setIpfsHash] = useState("");
  const [otp, setOtp] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    setSelectedFile(file);
    
    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    
    return () => URL.revokeObjectURL(objectUrl);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".png", ".jpg", ".gif"],
      "video/*": [".mp4", ".avi", ".mov"],
      "application/pdf": [".pdf"],
      "application/msword": [".doc", ".docx"],
      "text/plain": [".txt"]
    },
    multiple: false
  });

  // 🔐 Encrypt the file before uploading
  const encryptFile = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const key = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex); // 256-bit key
        const encryptedData = CryptoJS.AES.encrypt(reader.result, key).toString();
        setEncryptionKey(key);
        resolve({ encryptedData, key });
      };
    });
  };

  // ⬆️ Upload file to IPFS
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

      const formData = new FormData();
      formData.append("file", new Blob([encryptedData], { type: "text/plain" })); // Upload encrypted file

      const response = await axios.post("https://acutev2.onrender.com/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setIpfsHash(response.data.ipfsHash);
      alert(`File uploaded! IPFS Hash: ${response.data.ipfsHash}`);

    } catch (error) {
      console.error("Upload failed:", error);
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
      const otpResponse = await axios.post("https://acutev2.onrender.com/generate-otp", {
        recipient,
        ipfsHash
      });
      const generatedOtp = otpResponse.data.otp;
      setOtp(generatedOtp);

      if (!window.ethereum) {
        alert("MetaMask not detected! Please install MetaMask.");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, PhotoZappABI, signer);

      // 🔑 Encrypt key before sending (optional for extra security)
      const encryptedKey = CryptoJS.AES.encrypt(encryptionKey, recipient).toString();

      const tx = await contract.sendFile(recipient, ipfsHash, encryptedKey, String(generatedOtp));
      await tx.wait(); // Wait for confirmation

      console.log("Transaction successful:", tx);
      alert(`Photo sent successfully! Transaction Hash: ${tx.hash}`);

    } catch (error) {
      console.error("Transaction failed:", error);
      alert("Failed to send photo. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="form-container glass-effect">
        <h2 className="section-title">Send File!</h2>
        
        <div 
          {...getRootProps()} 
          className={`dropzone ${isDragActive ? 'active' : ''} ${selectedFile ? 'has-file' : ''}`}
        >
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

        <button 
          className="action-button upload-button"
          onClick={handleUpload} 
          disabled={!selectedFile || loading}
        >
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

        <button 
          className="action-button send-button"
          onClick={sendPhoto}
          disabled={!ipfsHash || !recipient || loading}
        >
          {loading ? <Loader className="spin" /> : <Send size={20} />}
          <span>{loading ? "Processing..." : "Send Photo"}</span>
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
