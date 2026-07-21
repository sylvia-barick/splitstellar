import {
  isConnected,
  requestAccess,
  getAddress,
  getNetworkDetails,
  isAllowed,
} from "@stellar/freighter-api";

/**
 * Checks if the Freighter browser extension is installed.
 */
export async function isFreighterInstalled(): Promise<boolean> {
  // Freighter is only available in browser environments
  if (typeof window === "undefined") return false;
  
  try {
    const res = await isConnected();
    return !!res.isConnected;
  } catch (error) {
    console.error("Error checking Freighter installation status:", error);
    return false;
  }
}

/**
 * Connects the wallet by requesting account access from Freighter.
 * Throws errors if Freighter is not installed, user rejects, or connection fails.
 */
export async function connectWallet(): Promise<string> {
  const installed = await isFreighterInstalled();
  if (!installed) {
    throw new Error("Freighter not installed. Please install the Freighter extension.");
  }

  try {
    // Request access initiates the freighter connection modal
    const accessRes = await requestAccess();
    
    if (accessRes.error) {
      throw new Error(accessRes.error);
    }
    
    if (!accessRes.address) {
      throw new Error("User rejected the connection request.");
    }

    return accessRes.address;
  } catch (error) {
    console.error("connectWallet error:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to connect to Freighter.");
  }
}

/**
 * Retrieves the currently authorized public key/address from Freighter.
 */
export async function getPublicKey(): Promise<string> {
  const installed = await isFreighterInstalled();
  if (!installed) {
    throw new Error("Freighter not installed.");
  }

  try {
    const addressRes = await getAddress();
    
    if (addressRes.error) {
      throw new Error(addressRes.error);
    }

    if (!addressRes.address) {
      throw new Error("No authorized account found.");
    }

    return addressRes.address;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    // Only log actual unexpected errors, not simple authorization/connection checks
    if (
      message !== "No authorized account found." &&
      !message.toLowerCase().includes("user rejected") &&
      !message.toLowerCase().includes("not authorized")
    ) {
      console.error("getPublicKey unexpected error:", error);
    }
    throw new Error(message || "Failed to retrieve public key.");
  }
}

/**
 * Checks if the application is currently allowed to connect by Freighter.
 */
export async function checkIsAllowed(): Promise<boolean> {
  const installed = await isFreighterInstalled();
  if (!installed) return false;

  try {
    const res = await isAllowed();
    return !!res.isAllowed;
  } catch {
    return false;
  }
}

/**
 * Simulates wallet disconnection client-side by clearing stored data.
 */
export async function disconnectWallet(): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.removeItem("splitstellar_wallet_connected");
    localStorage.removeItem("splitstellar_wallet_address");
  }
}

/**
 * Validates whether the user's Freighter wallet is active on Stellar Testnet.
 */
export async function checkNetworkIsTestnet(): Promise<boolean> {
  const installed = await isFreighterInstalled();
  if (!installed) return false;

  try {
    const networkRes = await getNetworkDetails();
    if (networkRes.error) {
      return false;
    }
    return networkRes.network === "TESTNET";
  } catch (error) {
    console.error("checkNetworkIsTestnet error:", error);
    return false;
  }
}

export const walletService = {
  isInstalled: isFreighterInstalled,
  connect: connectWallet,
  getAddress: async (): Promise<string | null> => {
    try {
      return await getPublicKey();
    } catch {
      return null;
    }
  },
  getNetwork: async (): Promise<string | null> => {
    try {
      const isTest = await checkNetworkIsTestnet();
      return isTest ? "TESTNET" : "PUBLIC";
    } catch {
      return null;
    }
  },
  disconnect: disconnectWallet,
};
