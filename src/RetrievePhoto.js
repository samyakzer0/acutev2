import React, { useState, useEffect } from "react";
import {ethers, Contract, BrowserProvider } from "ethers";
import contractABI from "./artifacts/PhotoTransfer.json";
import { Download, Loader, Key, Image } from 'lucide-react';

const CONTRACT_ADDRESS = "0x310D314A19425008c82994A1aD86c8191a067cF4";

function RetrievePhotoPage() {
  const [walletAddress, setWalletAddress] = useState("");
  const [otp, setOtp] = useState("");
  const [ipfsHash, setIpfsHash] = useState("");
  const [retrievedIPFSHash, setRetrievedIPFSHash] = useState(null);
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

  // Handle OTP verification and retrieval from the contract
  const handleRetrieve = async () => {
    try {
      setLoading(true);
      
      if (!window.ethereum) {
        alert("MetaMask not detected! Please install MetaMask.");
        return;
      }
  
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI , signer);
  
      // Call the contract function
      const retrievedHash = await contract.retrieveFile(String(otp));
      
      console.log("Contract Response:", retrievedHash);  // Debugging log
  
      if (!retrievedHash || retrievedHash === "") {
        alert("No file found or incorrect OTP.");
      } else {
        setIpfsHash(retrievedHash);
      }
    } catch (error) {
      console.error("Error retrieving IPFS hash:", error);
      alert("Error retrieving file. Please try again.");
    } finally {
      setLoading(false);
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

        {ipfsHash && (
          <div className="retrieved-content glass-effect">
            <div className="info-box">
              <p className="label">IPFS Hash:</p>
              <p className="value">{ipfsHash}</p>
            </div>
            
            <div className="image-preview-container">
              <img 
                src={`https://ipfs.io/ipfs/${ipfsHash}`} 
                alt="Retrieved" 
                className="retrieved-image"
              />
            </div>
            
            <a 
              href={`https://ipfs.io/ipfs/${ipfsHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="view-button glass-effect"
            >
              <Image size={20} />
              <span>View Full Image</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default RetrievePhotoPage;