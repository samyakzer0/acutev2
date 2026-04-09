import { EXPECTED_CHAIN_HEX } from "../config/web3";

export async function getCurrentChainHex() {
  if (!window.ethereum) {
    return null;
  }

  return window.ethereum.request({ method: "eth_chainId" });
}

export async function ensureExpectedNetwork() {
  if (!window.ethereum) {
    throw new Error("MetaMask not detected");
  }

  const currentChainHex = await getCurrentChainHex();
  if (currentChainHex === EXPECTED_CHAIN_HEX) {
    return true;
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: EXPECTED_CHAIN_HEX }]
    });
    return true;
  } catch (switchError) {
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: EXPECTED_CHAIN_HEX,
            chainName: "Sepolia",
            nativeCurrency: {
              name: "SepoliaETH",
              symbol: "ETH",
              decimals: 18
            },
            rpcUrls: ["https://rpc.sepolia.org"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"]
          }
        ]
      });
      return true;
    }

    if (switchError.code === 4001) {
      return false;
    }

    throw switchError;
  }
}
