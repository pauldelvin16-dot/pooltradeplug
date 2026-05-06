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

export const SUPPORTED_CHAINS = [mainnet, bsc, polygon, arbitrum, optimism, base] as const;

const ALCHEMY_NETS: Record<number, string> = {
  [mainnet.id]: "eth-mainnet",
  [bsc.id]: "bnb-mainnet",
  [polygon.id]: "polygon-mainnet",
  [arbitrum.id]: "arb-mainnet",
  [optimism.id]: "opt-mainnet",
  [base.id]: "base-mainnet",
};

export const CHAIN_META: Record<number, { name: string; symbol: string; logo: string; explorer: string }> = {
  1: { name: "Ethereum", symbol: "ETH", logo: "🔷", explorer: "https://etherscan.io" },
  56: { name: "BNB Smart Chain", symbol: "BNB", logo: "🟡", explorer: "https://bscscan.com" },
  137: { name: "Polygon", symbol: "MATIC", logo: "🟣", explorer: "https://polygonscan.com" },
  42161: { name: "Arbitrum", symbol: "ETH", logo: "🔵", explorer: "https://arbiscan.io" },
  10: { name: "Optimism", symbol: "ETH", logo: "🔴", explorer: "https://optimistic.etherscan.io" },
  8453: { name: "Base", symbol: "ETH", logo: "🟦", explorer: "https://basescan.org" },
};

export const buildWagmiConfig = (projectId?: string | null, alchemyKey?: string | null) => {
  const validProjectId = projectId && /^[a-f0-9]{32}$/i.test(projectId) ? projectId : null;
  const connectors = connectorsForWallets(
    [
      {
        groupName: validProjectId ? "Recommended" : "Installed wallets",
        wallets: validProjectId
          ? [injectedWallet, metaMaskWallet, walletConnectWallet, coinbaseWallet, trustWallet, rainbowWallet]
          : [injectedWallet],
      },
    ],
    {
      appName: "TradeLux",
      projectId: validProjectId || "00000000000000000000000000000000",
    }
  );

  const rpc = (chainId: number) => {
    const network = ALCHEMY_NETS[chainId];
    return alchemyKey && network ? `https://${network}.g.alchemy.com/v2/${alchemyKey}` : undefined;
  };

  return createConfig({
    connectors,
    chains: SUPPORTED_CHAINS as any,
    transports: {
      [mainnet.id]: http(rpc(mainnet.id), { timeout: 8000, retryCount: 1 }),
      [bsc.id]: http(rpc(bsc.id), { timeout: 8000, retryCount: 1 }),
      [polygon.id]: http(rpc(polygon.id), { timeout: 8000, retryCount: 1 }),
      [arbitrum.id]: http(rpc(arbitrum.id), { timeout: 8000, retryCount: 1 }),
      [optimism.id]: http(rpc(optimism.id), { timeout: 8000, retryCount: 1 }),
      [base.id]: http(rpc(base.id), { timeout: 8000, retryCount: 1 }),
    },
    ssr: false,
  });
};
