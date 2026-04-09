import React, { useState, useEffect } from "react";
import { ethers, BrowserProvider } from "ethers";
import CryptoJS from "crypto-js";
import contractABI from "./artifacts/PhotoTransfer.json";
import { Download, Loader } from "lucide-react";
import { CHAIN_NAME, CONTRACT_ADDRESS, IPFS_GATEWAYS, getTxExplorerUrl } from "./config/web3";
import { ensureExpectedNetwork } from "./utils/network";

const TX_STATE = {
  idle: "idle",
  awaitingSignature: "awaiting-signature",
  pending: "pending",
  confirmed: "confirmed",
  error: "error"
};

async function fetchFromGateways(ipfsHash) {
  let lastError = null;

  for (const gatewayBase of IPFS_GATEWAYS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(`${gatewayBase}${ipfsHash}`, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Gateway responded ${response.status}`);
      }

      const payload = await response.text();
      return payload;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
    }
  }

  throw lastError || new Error("All IPFS gateways failed");
}

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

function RetrievePhotoPage() {
  const [walletAddress, setWalletAddress] = useState("");
  const [otp, setOtp] = useState("");
  const [ipfsHash, setIpfsHash] = useState("");
  const [retrievedFile, setRetrievedFile] = useState(null);
  const [fileType, setFileType] = useState("");
  const [loading, setLoading] = useState(false);
  const [networkWarning, setNetworkWarning] = useState("");
  const [txState, setTxState] = useState(TX_STATE.idle);
  const [txMessage, setTxMessage] = useState("");
  const [txHash, setTxHash] = useState("");

  const setTx = (state, message, hash = "") => {
    setTxState(state);
    setTxMessage(message);
    setTxHash(hash);
  };

  useEffect(() => {
    connectWallet();

    if (!window.ethereum) {
      return;
    }

    const handleAccountsChanged = (accounts) => {
      setWalletAddress(accounts?.[0] || "");
    };

    const handleChainChanged = () => {
      setNetworkWarning("");
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  // 🔗 Connect to MetaMask Wallet
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setWalletAddress(accounts[0]);
        console.log("✅ Connected to wallet:", accounts[0]);
      } catch (error) {
        console.error("❌ Failed to connect wallet:", error);
      }
    } else {
      alert("Please install MetaMask.");
    }
  };

  // 🔍 Retrieve File & Encryption Key from Contract
  const handleRetrieve = async () => {
    if (!/^\d{6}$/.test(otp.trim())) {
      alert("OTP must be exactly 6 digits.");
      return;
    }

    try {
      setLoading(true);
      setNetworkWarning("");
      setTx(TX_STATE.idle, "");

      if (!window.ethereum) {
        alert("MetaMask not detected! Please install MetaMask.");
        return;
      }

      const switched = await ensureExpectedNetwork();
      if (!switched) {
        setNetworkWarning(`Please switch your wallet to ${CHAIN_NAME} to continue.`);
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

      console.log("📢 Fetching file from smart contract...");

      // Call contract to get IPFS Hash & Encryption Key
      const [retrievedHash, encryptionKey] = await contract.getFileByRecipient(String(otp.trim()));

      console.log("🔗 IPFS Hash:", retrievedHash);
      console.log("🔑 Encryption Key (from contract):", encryptionKey);

      if (!retrievedHash || !encryptionKey) {
        alert("No file found or incorrect OTP.");
        return;
      }

      setIpfsHash(retrievedHash);

      await decryptAndDownloadFile(retrievedHash, encryptionKey);
    } catch (error) {
      console.error("❌ Error retrieving file:", error);
      setTx(TX_STATE.error, error?.shortMessage || error?.message || "Failed to retrieve file");
      alert("Error retrieving file. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 🔓 Decrypt and Download the File
  const decryptAndDownloadFile = async (ipfsHash, encryptionKey) => {
    try {
      console.log("📥 Fetching encrypted file from IPFS...");
      const encryptedDataBase64 = await fetchFromGateways(ipfsHash);
      console.log("🛠️ Encrypted File Data Length:", encryptedDataBase64.length);

      // ✅ Decode the Base64 encrypted data
      const decodedPayload = atob(encryptedDataBase64);
      const [mimeType, fileExt, encryptedData] = decodedPayload.split("::"); // Extract MIME type & extension
      
      // ✅ Ensure correct file extension
      const validFileExtension = fileExt || mimeType.split("/")[1] || "bin";
      setFileType(validFileExtension);
      
      console.log("📂 Extracted File Type:", mimeType, "Extension:", validFileExtension);

      // 🔓 **Decrypt the file using the correct key**
      const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
      const decryptedBase64 = decryptedBytes.toString(CryptoJS.enc.Base64);

      if (!decryptedBase64) {
        throw new Error("❌ Decryption failed: Empty output.");
      }

      console.log("✅ Decrypted File Data (Base64):", decryptedBase64);

      // Convert decrypted Base64 data to Blob
      const byteCharacters = atob(decryptedBase64);
      const byteArrays = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArrays[i] = byteCharacters.charCodeAt(i);
      }

      const blob = new Blob([byteArrays], { type: mimeType });
      const objectUrl = URL.createObjectURL(blob);
      setRetrievedFile(objectUrl);

      await accessAndDeleteKey();
      alert("✅ File successfully decrypted!");

    } catch (error) {
      console.error("❌ Decryption error:", error);
      setTx(TX_STATE.error, error?.message || "Decryption failed");
      alert("Decryption failed. Please check the key or file integrity.");
    }
  };

  // 🚀 Call smart contract to delete encryption key after first access
  const accessAndDeleteKey = async () => {
    try {
      if (!window.ethereum) return;

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

      console.log("🗑️ Deleting encryption key from contract...");
      setTx(TX_STATE.awaitingSignature, "Awaiting wallet signature for access confirmation...");
      const tx = await contract.accessFile(String(otp.trim()));
      setTx(TX_STATE.pending, "Confirmation transaction submitted.", tx.hash);
      await tx.wait();

      console.log("✅ Encryption key deleted.");
      setTx(TX_STATE.confirmed, "Access confirmed on-chain.", tx.hash);
    } catch (error) {
      console.error("❌ Failed to delete encryption key:", error);
      setTx(TX_STATE.error, error?.shortMessage || error?.message || "Failed to confirm access");
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
        <h2 className="section-title">Retrieve File!</h2>

        {walletAddress && (
          <div className="info-box glass-effect">
            <p className="label">Connected Wallet</p>
            <p className="value">{walletAddress}</p>
          </div>
        )}

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
          <span>{loading ? "Retrieving..." : "Retrieve File"}</span>
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

        {ipfsHash && (
          <div className="info-box glass-effect">
            <p className="label">Retrieved IPFS Hash</p>
            <p className="value">{ipfsHash}</p>
          </div>
        )}

        {retrievedFile && (
          <div className="retrieved-content glass-effect">
            <a href={retrievedFile} download={`decrypted-file.${fileType}`} className="view-button glass-effect">
              <Download size={20} />
              <span>Download File</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default RetrievePhotoPage;
