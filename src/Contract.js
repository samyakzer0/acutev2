import { ethers, BrowserProvider } from "ethers";
import PhotoTransferArtifact from "./artifacts/PhotoTransfer.json";

const CONTRACT_ADDRESS = "0x444CE1A913DEDBAEE39eD59B77B3D7D5De6b7452"; // Replace with actual deployed address

// 🔹 Get the BrowserProvider instance
export const getProvider = () => {
  if (window.ethereum) {
    return new BrowserProvider(window.ethereum);
  } else {
    alert("❌ MetaMask not detected! Please install MetaMask.");
    return null;
  }
};

// 🔹 Get the contract instance
export const getContract = async () => {
  const provider = getProvider();
  if (!provider) return null;

  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, PhotoTransferArtifact.abi, signer);
};

// 📤 Send a photo (Includes `encKey` & `otp`)
export const sendPhoto = async (recipient, ipfsHash, encKey, otp) => {
  try {
    const contract = await getContract();
    if (!contract) return;

    console.log("🚀 Sending File with OTP:", String(otp).trim());

    const tx = await contract.sendFile(recipient, ipfsHash, encKey, String(otp).trim());
    await tx.wait();
    console.log("✅ Photo sent successfully!", tx.hash);
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

    console.log("🔍 Retrieving file with OTP:", String(otp).trim());

    const [ipfsHash, encKey] = await contract.getFileByRecipient(String(otp).trim());
    console.log("📥 Retrieved file:", { ipfsHash, encKey });

    if (!ipfsHash || ipfsHash === "") {
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

    console.log("🔓 Marking file as accessed with OTP:", String(otp).trim());

    const tx = await contract.accessFile(String(otp).trim());
    await tx.wait();
    console.log("🔐 Encryption key deleted, file is now inaccessible.");
  } catch (error) {
    console.error("❌ Error accessing file:", error);
  }
};
