export const CONTRACT_ADDRESS = "0x444CE1A913DEDBAEE39eD59B77B3D7D5De6b7452";
export const EXPECTED_CHAIN_ID = 11155111; // Sepolia
export const EXPECTED_CHAIN_HEX = "0xaa36a7";
export const CHAIN_NAME = "Sepolia";

export const EXPLORER_BASE_URL = "https://sepolia.etherscan.io/tx/";

export const BACKEND_BASE_URL = process.env.REACT_APP_BACKEND_BASE_URL || "https://acutev2.onrender.com";

export const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/"
];

export function getTxExplorerUrl(txHash) {
  return `${EXPLORER_BASE_URL}${txHash}`;
}
