import { useState, useEffect } from "react";
import { Download, X, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop" | null>(null);

  useEffect(() => {
    // Already installed?
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-ignore iOS Safari
      window.navigator.standalone === true;
    if (standalone) return;

    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 86400000) return;

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);

    if (isIOS) {
      setPlatform("ios");
      setShowBanner(true);
      return;
    }
    if (isAndroid) setPlatform("android");
    else setPlatform("desktop");

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (platform === "ios") {
      setShowIOSGuide(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShowBanner(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem("pwa-install-dismissed", String(Date.now()));
  };

  if (!showBanner && !showIOSGuide) return null;

  // iOS Step-by-step modal
  if (showIOSGuide) {
    return (
      <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in">
        <div className="glass-card p-6 max-w-md w-full border border-primary/20 relative">
          <button onClick={handleDismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center mb-4">
            <Download className="w-6 h-6 text-primary-foreground" />
          </div>
          <h3 className="text-lg font-display font-bold mb-1">Install TradeLux on iPhone</h3>
          <p className="text-xs text-muted-foreground mb-4">Get the full app experience in 3 quick steps</p>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full gold-gradient text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">1</span>
              <span>Tap the <Share className="inline w-4 h-4 text-primary -mt-0.5" /> <strong>Share</strong> button at the bottom of Safari</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full gold-gradient text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">2</span>
              <span>Scroll down and tap <Plus className="inline w-4 h-4 text-primary -mt-0.5" /> <strong>Add to Home Screen</strong></span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full gold-gradient text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">3</span>
              <span>Tap <strong>Add</strong> in the top-right corner. TradeLux will appear on your home screen!</span>
            </li>
          </ol>
          <Button onClick={handleDismiss} className="w-full mt-5 gold-gradient text-primary-foreground font-semibold hover:opacity-90">
            Got it
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-50 animate-slide-up">
      <div className="glass-card p-4 flex items-center gap-3 max-w-md mx-auto border border-primary/20 shadow-gold-glow">
        <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Install TradeLux</p>
          <p className="text-xs text-muted-foreground">
            {platform === "ios"
              ? "Add to Home Screen for quick access"
              : "Get the app for a faster, fullscreen experience"}
          </p>
        </div>
        <Button size="sm" onClick={handleInstall} className="gold-gradient text-primary-foreground font-semibold hover:opacity-90 shrink-0">
          Install
        </Button>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
