import { ethers, BrowserProvider } from "ethers";
import PhotoTransferArtifact from "./artifacts/PhotoTransfer.json"; // Import the ABI file

const CONTRACT_ADDRESS = "0x1B605fB6880c2d10334F69ffc920D61FE90f46a6"; // Replace with your actual deployed contract address

// 🔹 Get the BrowserProvider instance
export const getProvider = () => {
  if (window.ethereum) {
    return new BrowserProvider(window.ethereum);
  } else {
    console.error("Please install MetaMask!");
    return null;
  }
};

// 🔹 Get the contract instance
export const getContract = async () => {
  const provider = getProvider();
  if (!provider) return;

  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, PhotoTransferArtifact.abi, signer);
};

// 📤 Send a photo (now includes `encKey` & `otp`)
export const sendPhoto = async (recipient, ipfsHash, encKey, otp) => {
  try {
    const contract = await getContract();
    if (!contract) return;

    const tx = await contract.sendFile(recipient, ipfsHash, encKey, otp);
    await tx.wait(); // Wait for transaction confirmation
    console.log("✅ Photo sent successfully!");
    return tx.hash;
  } catch (error) {
    console.error("❌ Error sending photo:", error);
    return null;
  }
};

// 🔍 Retrieve a photo using OTP (fetches both `ipfsHash` & `encKey`)
export const getFileByRecipient = async (otp) => {
  try {
    const contract = await getContract();
    if (!contract) return;

    const [ipfsHash, encKey] = await contract.getFileByRecipient(otp);
    console.log("📥 Retrieved file:", { ipfsHash, encKey });

    if (!ipfsHash) {
      console.warn("⚠️ No file found or invalid OTP.");
      return null;
    }

    return { ipfsHash, encKey };
  } catch (error) {
    console.error("❌ Error retrieving file:", error);
    return null;
  }
};

// 🚀 Mark file as accessed (deletes the encryption key)
export const accessFile = async (otp) => {
  try {
    const contract = await getContract();
    if (!contract) return;

    const tx = await contract.accessFile(otp);
    await tx.wait();
    console.log("🔐 Encryption key deleted, file is now inaccessible.");
  } catch (error) {
    console.error("❌ Error accessing file:", error);
  }
};
