import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen py-20">
      <div className="container max-w-3xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-3xl font-display font-bold mb-8 gold-text">Privacy Policy</h1>
        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
            <p>We collect personal information including name, email, transaction data, and device information to provide and improve our services.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">2. How We Use Your Data</h2>
            <p>Data is used for account management, transaction processing, security monitoring, compliance, and platform improvement. We never sell your personal data to third parties.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Data Security</h2>
            <p>We implement industry-standard encryption and security measures. However, no system is 100% secure. You acknowledge and accept inherent risks of digital platforms.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Cookies & Tracking</h2>
            <p>We use cookies for session management and analytics. You may disable cookies in your browser settings, but this may affect functionality.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. Contact support for data requests. Account deletion requests are processed within 30 days.</p>
          </section>
          <p className="text-xs">Last updated: April 11, 2026</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
