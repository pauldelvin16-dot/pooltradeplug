import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";

const RiskPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen py-20">
      <div className="container max-w-3xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-3 mb-8">
          <AlertTriangle className="w-8 h-8 text-warning" />
          <h1 className="text-3xl font-display font-bold gold-text">Risk Disclosure</h1>
        </div>
        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground">
          <div className="p-4 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm">
            <strong>WARNING:</strong> Trading involves substantial risk of loss and is not suitable for all investors. You should carefully consider whether trading is appropriate for you in light of your financial condition.
          </div>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Trading Risk</h2>
            <p>Forex, CFDs, and cryptocurrency trading carry a high level of risk. You may lose more than your initial investment. Past performance is not indicative of future results.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Pool Trading Risk</h2>
            <p>Pool trading outcomes depend on market conditions and pool management. There is no guarantee that profit targets will be met. Failed pools may result in partial or total loss of entry amounts.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Cryptocurrency Risk</h2>
            <p>USDT and cryptocurrency values can fluctuate. Blockchain transactions are irreversible. Ensure you verify all wallet addresses before sending funds.</p>
          </section>
          <p className="text-xs">Last updated: April 11, 2026</p>
        </div>
      </div>
    </div>
  );
};

export default RiskPage;
