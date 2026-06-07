import React from "react";

interface State { hasError: boolean; message?: string }

export class Web3ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err?.message || "Wallet system failed to load." };
  }

  componentDidCatch(err: Error) {
    console.error("[Web3ErrorBoundary]", err);
  }

  render() {
    if (this.state.hasError) {
      return (
        <>
          <div className="fixed top-2 inset-x-2 z-[100] glass-card border border-destructive/40 bg-destructive/10 text-destructive text-xs px-3 py-2 rounded-md shadow-lg max-w-xl mx-auto">
            ⚠️ Wallet connection module is misconfigured ({this.state.message}). The app stays usable — admin should set a valid WalletConnect Project ID in Admin → Web3 Wallets.
          </div>
          {this.props.children}
        </>
      );
    }
    return this.props.children;
  }
}
