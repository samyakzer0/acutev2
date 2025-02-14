import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { ethers } from "ethers";
import { Upload, Send, Loader, CheckCircle, Image } from 'lucide-react';
import PhotoZappABI from "./artifacts/PhotoTransfer.json";

const CONTRACT_ADDRESS = "0x310D314A19425008c82994A1aD86c8191a067cF4";

export default function SendPhotoPage() {
  const [recipient, setRecipient] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [ipfsHash, setIpfsHash] = useState("");
  const [otp, setOtp] = useState(null);
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
  // Handle file selection
  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  // Upload file to backend & Pinata
  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      setLoading(true);
      const response = await axios.post("http://localhost:5000/upload", formData, {
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

  // Send transaction to the blockchain using Ethers.js
  const sendPhoto = async () => {
    if (!ipfsHash || !recipient) {
      alert("Upload a file and enter a recipient address first!");
      return;
    }

    try {
      setLoading(true);

      // Generate OTP
      const otpResponse = await axios.get("http://localhost:5000/generate-otp");
      const generatedOtp = otpResponse.data.otp;
      setOtp(generatedOtp);

      // Check for MetaMask
      if (!window.ethereum) {
        alert("MetaMask not detected! Please install MetaMask.");
        return;
      }

      // Connect to MetaMask
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, PhotoZappABI, signer);

      // Send transaction to smart contract
      const tx = await contract.sendFile(recipient, ipfsHash, String(generatedOtp));
      await tx.wait(); // Wait for transaction confirmation

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
              <div className="file-info">
                <p>{selectedFile.name}</p>
                <p>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
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