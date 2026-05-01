import { http, createConfig } from "wagmi";
import { mainnet, bsc, polygon, arbitrum, optimism, base } from "wagmi/chains";
import {
  injectedWallet,
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  trustWallet,
  rainbowWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";

// Project ID is fetched from admin_settings.web3_project_id at runtime.
// We need a value at module-init for wagmi config — fall back to a placeholder.
// The real value is injected via setWeb3ProjectId() called from Web3Provider.
let _projectId = "00000000000000000000000000000000";
export const setWeb3ProjectId = (id: string) => { _projectId = id || _projectId; };

export const SUPPORTED_CHAINS = [mainnet, bsc, polygon, arbitrum, optimism, base] as const;

export const CHAIN_META: Record<number, { name: string; symbol: string; logo: string; explorer: string }> = {
  1: { name: "Ethereum", symbol: "ETH", logo: "🔷", explorer: "https://etherscan.io" },
  56: { name: "BNB Smart Chain", symbol: "BNB", logo: "🟡", explorer: "https://bscscan.com" },
  137: { name: "Polygon", symbol: "MATIC", logo: "🟣", explorer: "https://polygonscan.com" },
  42161: { name: "Arbitrum", symbol: "ETH", logo: "🔵", explorer: "https://arbiscan.io" },
  10: { name: "Optimism", symbol: "ETH", logo: "🔴", explorer: "https://optimistic.etherscan.io" },
  8453: { name: "Base", symbol: "ETH", logo: "🟦", explorer: "https://basescan.org" },
};

export const buildWagmiConfig = (projectId: string) => {
  setWeb3ProjectId(projectId);
  const connectors = connectorsForWallets(
    [
      {
        groupName: "Recommended",
        wallets: [
          injectedWallet,
          metaMaskWallet,
          walletConnectWallet,
          coinbaseWallet,
          trustWallet,
          rainbowWallet,
        ],
      },
    ],
    {
      appName: "TradeLux",
      projectId,
    }
  );

  return createConfig({
    connectors,
    chains: SUPPORTED_CHAINS as any,
    transports: {
      [mainnet.id]: http(),
      [bsc.id]: http(),
      [polygon.id]: http(),
      [arbitrum.id]: http(),
      [optimism.id]: http(),
      [base.id]: http(),
    },
    ssr: false,
  });
};
