import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermsPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen py-20">
      <div className="container max-w-3xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-3xl font-display font-bold mb-8 gold-text">Terms & Conditions</h1>
        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing and using TradeLux ("Platform"), you accept and agree to be bound by these Terms and Conditions. If you do not agree, you must not use the Platform.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Eligibility</h2>
            <p>You must be at least 18 years old and legally able to enter contracts in your jurisdiction. You are responsible for ensuring compliance with local laws.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Account Responsibilities</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You must immediately notify us of any unauthorized use. The Platform is not liable for losses arising from unauthorized access.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Trading & Pool Participation</h2>
            <p>Pool trading involves risk. Past performance does not guarantee future results. The Platform does not provide financial advice. Participation in trading pools is voluntary and subject to pool-specific rules set by administrators.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Deposits & Withdrawals</h2>
            <p>Deposits are processed in USDT (TRC20) only. Users must verify wallet addresses before sending. The Platform is not responsible for funds sent to incorrect addresses. Withdrawal processing times may vary.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">6. MT5 Account Management</h2>
            <p>MT5 accounts are subject to allocation limits set by administrators. Availability may be restricted at any time. The Platform reserves the right to disable MT5 features for maintenance or compliance purposes.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Limitation of Liability</h2>
            <p>The Platform is provided "as is" without warranties. We are not liable for any trading losses, technical failures, or third-party service disruptions. Maximum liability is limited to the amount deposited.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Modifications</h2>
            <p>We reserve the right to modify these terms at any time. Continued use after changes constitutes acceptance.</p>
          </section>
          <p className="text-xs">Last updated: April 11, 2026</p>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
