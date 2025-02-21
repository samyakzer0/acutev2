import React, { useState, useEffect } from "react";
import { ethers, Contract, BrowserProvider } from "ethers";
import CryptoJS from "crypto-js"; // Import CryptoJS for decryption
import contractABI from "./artifacts/PhotoTransfer.json";
import { Download, Loader, Key, Image } from 'lucide-react';

const CONTRACT_ADDRESS = "0x444CE1A913DEDBAEE39eD59B77B3D7D5De6b7452";

function RetrievePhotoPage() {
  const [walletAddress, setWalletAddress] = useState("");
  const [otp, setOtp] = useState("");
  const [ipfsHash, setIpfsHash] = useState("");
  const [decryptionKey, setDecryptionKey] = useState("");
  const [retrievedFile, setRetrievedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    connectWallet();
  }, []);

  // Connect to MetaMask Wallet
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setWalletAddress(accounts[0]);
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
    } else {
      alert("Please install MetaMask.");
    }
  };

  // 🔍 Retrieve File & Decryption Key from Contract
  const handleRetrieve = async () => {
    try {
      setLoading(true);

      if (!window.ethereum) {
        alert("MetaMask not detected! Please install MetaMask.");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

      // Call contract to get IPFS Hash & Encrypted Key
      const [retrievedHash, encryptedKey] = await contract.getFileByRecipient(String(otp));

      console.log("Contract Response:", retrievedHash, encryptedKey); // Debugging log

      if (!retrievedHash || retrievedHash === "") {
        alert("No file found or incorrect OTP.");
      } else {
        setIpfsHash(retrievedHash);
        setDecryptionKey(encryptedKey);
        await decryptAndDownloadFile(retrievedHash, encryptedKey);
      }
    } catch (error) {
      console.error("Error retrieving file:", error);
      alert("Error retrieving file. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 🔑 Decrypt and Download the File
  const decryptAndDownloadFile = async (ipfsHash, encryptedKey) => {
    try {
      // Fetch encrypted file from IPFS
      const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
      const encryptedData = await response.text(); // Encrypted Base64 file data

      // Decrypt the key first
      const decryptedKey = CryptoJS.AES.decrypt(encryptedKey, walletAddress).toString(CryptoJS.enc.Utf8);

      // Decrypt the file
      const decryptedData = CryptoJS.AES.decrypt(encryptedData, decryptedKey).toString(CryptoJS.enc.Utf8);
      
      if (!decryptedData) {
        alert("Decryption failed. Invalid key.");
        return;
      }

      // Convert Base64 to Blob
      const byteCharacters = atob(decryptedData.split(",")[1]); 
      const byteArrays = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArrays[i] = byteCharacters.charCodeAt(i);
      }

      const blob = new Blob([byteArrays], { type: "image/jpeg" }); // Adjust MIME type as needed
      const objectUrl = URL.createObjectURL(blob);
      setRetrievedFile(objectUrl);

      // Call smart contract to delete the encryption key after first access
      await accessAndDeleteKey();
      
      alert("File successfully decrypted and downloaded!");

    } catch (error) {
      console.error("Decryption error:", error);
      alert("Decryption failed.");
    }
  };

  // Call smart contract to delete encryption key after first access
  const accessAndDeleteKey = async () => {
    try {
      if (!window.ethereum) return;

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

      const tx = await contract.accessFile(String(otp));
      await tx.wait();

      console.log("Encryption key deleted from contract.");
    } catch (error) {
      console.error("Failed to delete encryption key:", error);
    }
  };

  return (
    <div className="page-container">
      <div className="form-container glass-effect">
        <h2 className="section-title">Retrieve File!</h2>

        <div className="otp-input-container glass-effect">
          <input
            type="text"
            className="text-input"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
        </div>

        <button 
          className="action-button retrieve-button"
          onClick={handleRetrieve} 
          disabled={loading}
        >
          {loading ? <Loader className="spin" /> : <Download size={20} />}
          <span>{loading ? "Retrieving..." : "Retrieve Photo"}</span>
        </button>

        {retrievedFile && (
          <div className="retrieved-content glass-effect">
            <div className="image-preview-container">
              <img src={retrievedFile} alt="Retrieved" className="retrieved-image" />
            </div>

            <a href={retrievedFile} download="decrypted-file.jpg" className="view-button glass-effect">
              <Image size={20} />
              <span>Download File</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default RetrievePhotoPage;
