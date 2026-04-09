import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { ethers } from "ethers";
import CryptoJS from "crypto-js";
import { Upload, Send, Loader } from "lucide-react";
import PhotoZappABI from "./artifacts/PhotoTransfer.json";
import { BACKEND_BASE_URL, CHAIN_NAME, CONTRACT_ADDRESS, getTxExplorerUrl } from "./config/web3";
import { ensureExpectedNetwork, getCurrentChainHex } from "./utils/network";

const TX_STATE = {
  idle: "idle",
  awaitingSignature: "awaiting-signature",
  pending: "pending",
  confirmed: "confirmed",
  error: "error"
};

function TxStatus({ txState, txMessage, txHash }) {
  if (txState === TX_STATE.idle) {
    return null;
  }

  const className = txState === TX_STATE.confirmed
    ? "status-badge success"
    : txState === TX_STATE.error
      ? "status-badge error"
      : "status-badge pending";

  return (
    <div className="info-box glass-effect">
      <div className={className}>{txMessage}</div>
      {txHash && (
        <p className="hint" style={{ marginTop: "0.75rem" }}>
          Tx: <a href={getTxExplorerUrl(txHash)} target="_blank" rel="noreferrer">{txHash}</a>
        </p>
      )}
    </div>
  );
}

export default function SendPhotoPage() {
  const [recipient, setRecipient] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [ipfsHash, setIpfsHash] = useState("");
  const [otp, setOtp] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [networkWarning, setNetworkWarning] = useState("");
  const [txState, setTxState] = useState(TX_STATE.idle);
  const [txMessage, setTxMessage] = useState("");
  const [txHash, setTxHash] = useState("");

  const setTx = (state, message, hash = "") => {
    setTxState(state);
    setTxMessage(message);
    setTxHash(hash);
  };

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    setSelectedFile(file);

    if (file.type.startsWith("image")) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: false,
  });

  // 🔐 Encrypt the file & store as Base64
  const encryptFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = () => {
        const key = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
        const wordArray = CryptoJS.lib.WordArray.create(reader.result);
        const encryptedData = CryptoJS.AES.encrypt(wordArray, key).toString();
        setEncryptionKey(key);

        // ✅ Store both MIME type & file extension along with encrypted data
        const fileExt = file.name.split(".").pop() || "bin"; // Extract file extension, fallback to "bin"
        const payload = `${file.type}::${fileExt}::${encryptedData}`;
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

      const response = await axios.post(`${BACKEND_BASE_URL}/upload`, formData, {
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

    const trimmedRecipient = recipient.trim();
    if (!ethers.isAddress(trimmedRecipient)) {
      alert("Please enter a valid recipient wallet address.");
      return;
    }

    try {
      setLoading(true);
      setNetworkWarning("");
      setTx(TX_STATE.idle, "");

      const chainHex = await getCurrentChainHex();
      const switched = await ensureExpectedNetwork();
      if (!switched) {
        setNetworkWarning(`Please switch your wallet to ${CHAIN_NAME} to continue.`);
        return;
      }
      if (!chainHex) {
        setNetworkWarning("Wallet not available. Please connect MetaMask.");
        return;
      }

      console.log("📢 Requesting OTP...");
      const otpResponse = await axios.post(`${BACKEND_BASE_URL}/generate-otp`, {
        recipient: trimmedRecipient,
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

      setTx(TX_STATE.awaitingSignature, "Awaiting wallet signature...");
      console.log("🚀 Sending transaction...");
      const tx = await contract.sendFile(
        trimmedRecipient,
        ipfsHash,
        encryptionKey,
        String(generatedOtp)
      );
      setTx(TX_STATE.pending, "Transaction submitted. Waiting for confirmation...", tx.hash);
      await tx.wait();

      console.log("✅ Transaction successful:", tx);
      setTx(TX_STATE.confirmed, "Transaction confirmed.", tx.hash);
      alert(`File sent successfully! Transaction Hash: ${tx.hash}`);

    } catch (error) {
      console.error("❌ Transaction failed:", error);
      setTx(TX_STATE.error, error?.shortMessage || error?.message || "Transaction failed");
      alert("Failed to send photo. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      const switched = await ensureExpectedNetwork();
      if (switched) {
        setNetworkWarning("");
      }
    } catch (error) {
      setNetworkWarning(`Failed to switch network: ${error.message}`);
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

        {networkWarning && (
          <div className="info-box glass-effect">
            <p className="label">Network Guardrail</p>
            <p className="value">{networkWarning}</p>
            <button className="action-button" onClick={handleSwitchNetwork} type="button">
              Switch to {CHAIN_NAME}
            </button>
          </div>
        )}

        <TxStatus txState={txState} txMessage={txMessage} txHash={txHash} />

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
