import { http, createConfig } from "wagmi";
import { mainnet, bsc, polygon, arbitrum, optimism, base } from "wagmi/chains";
import { walletConnectWallet, injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { walletConnect } from "wagmi/connectors";

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

  const walletConnectStandardWallet = ({ projectId, walletConnectParameters }: any) => ({
    id: "walletConnectStandard",
    name: "WalletConnect",
    shortName: "WalletConnect",
    iconUrl: async () => (await import("@rainbow-me/rainbowkit/wallets/walletConnectWallet/walletConnectWallet.svg" as any)).default,
    iconBackground: "#3b99fc",
    installed: true,
    mobile: { getUri: (uri: string) => uri },
    qrCode: { getUri: (uri: string) => uri },
    createConnector: (walletDetails: any) => (config: any) => ({
      ...walletConnect({
        projectId,
        showQrModal: false,
        customStoragePrefix: "tradelux-standard-wc",
        ...(walletConnectParameters || {}),
      })(config),
      ...walletDetails,
    }),
  });

  // Discovery strategy: rely on `injectedWallet` (EIP-6963) so ONLY wallets actually
  // installed in the browser/in-app webview appear in the modal — no "Get" promos.
  // WalletConnect is kept as a standard RainbowKit QR/deep-link fallback. We avoid
  // the Reown/AppKit QR popup path that can throw `invalid border=0` in hardened browsers.
  const installed: any[] = [injectedWallet];
  const groups: any[] = [{ groupName: "Installed", wallets: installed }];
  if (validProjectId) {
    groups.push({ groupName: "WalletConnect", wallets: [walletConnectStandardWallet] });
  }

  const connectors = connectorsForWallets(groups, {
    appName: "TradeLux",
    projectId: validProjectId || "00000000000000000000000000000000",
  });

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
