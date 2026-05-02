import { ReactNode, useMemo } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { buildWagmiConfig } from "./config";

// Dedicated QueryClient for wagmi/RainbowKit to guarantee context is present
// even if the bundled react-query copy is not deduped with the app's instance.
const web3QueryClient = new QueryClient();

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const { data: settings } = useAdminSettings();
  const projectId = settings?.web3_project_id || "00000000000000000000000000000000";

  const config = useMemo(() => buildWagmiConfig(projectId), [projectId]);

  return (
    <WagmiProvider config={config} reconnectOnMount>
      <QueryClientProvider client={web3QueryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "hsl(43 96% 56%)",
            accentColorForeground: "#0a0d14",
            borderRadius: "medium",
          })}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
