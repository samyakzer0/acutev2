import { ethers, BrowserProvider } from "ethers";
import PhotoTransferArtifact from "./artifacts/PhotoTransfer.json"; // Import the ABI file

const CONTRACT_ADDRESS = "0x310D314A19425008c82994A1aD86c8191a067cF4"; // Replace with your actual deployed contract address

// Function to get the BrowserProvider instance
export const getProvider = () => {
  if (window.ethereum) {
    return new BrowserProvider(window.ethereum);
  } else {
    console.error("Please install MetaMask!");
    return null;
  }
};

// Function to get the contract instance
export const getContract = async () => {
  const provider = getProvider();
  if (!provider) return;

  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, PhotoTransferArtifact.abi, signer);
};

// Function to send a photo
export const sendPhoto = async (recipient, ipfsHash, isEncrypted) => {
  try {
    const contract = await getContract();
    if (!contract) return;

    const tx = await contract.sendFile(recipient, ipfsHash, String(generatedOtp));
    await tx.wait(); // Wait for the transaction to be mined
    console.log("Photo sent successfully");
  } catch (error) {
    console.error("Error sending photo:", error);
  }
};

// Function to retrieve a photo by its ID
export const getPhoto = async (photoId) => {
  try {
    const contract = await getContract();
    if (!contract) return;

    const ipfsHash = await contract.getPhoto(photoId);
    return ipfsHash;
  } catch (error) {
    console.error("Error retrieving photo:", error);
    return null;
  }
};
