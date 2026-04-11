import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

const Signup = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsla(43,96%,56%,0.06),transparent_60%)]" />
      <div className="w-full max-w-md relative animate-slide-up">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-display font-bold gold-text">Create Account</h1>
            <p className="text-sm text-muted-foreground mt-2">Join the elite trading community</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input placeholder="John" className="bg-secondary/50 border-border focus:border-primary" />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input placeholder="Doe" className="bg-secondary/50 border-border focus:border-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="trader@example.com" className="bg-secondary/50 border-border focus:border-primary" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="Min 8 characters" className="bg-secondary/50 border-border focus:border-primary pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="terms" checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} className="mt-0.5" />
              <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed">
                I agree to the{" "}
                <button type="button" onClick={() => navigate("/terms")} className="text-primary hover:underline">Terms & Conditions</button>
                {" "}and{" "}
                <button type="button" onClick={() => navigate("/privacy")} className="text-primary hover:underline">Privacy Policy</button>
              </label>
            </div>
            <Button type="submit" disabled={!agreed} className="w-full gold-gradient text-primary-foreground font-semibold hover:opacity-90 h-11 disabled:opacity-40">
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button onClick={() => navigate("/login")} className="text-primary hover:underline">Sign in</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
