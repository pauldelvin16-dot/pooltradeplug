import { ReactNode, useMemo } from "react";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { buildWagmiConfig } from "./config";

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const { data: settings } = useAdminSettings();
  const projectId = settings?.web3_project_id || "00000000000000000000000000000000";

  const config = useMemo(() => buildWagmiConfig(projectId), [projectId]);

  return (
    <WagmiProvider config={config} reconnectOnMount>
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
    </WagmiProvider>
  );
};
