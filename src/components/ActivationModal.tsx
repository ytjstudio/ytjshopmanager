import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Phone, CheckCircle2, AlertCircle, CreditCard, Key } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ActivationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

declare global {
  interface Window { PaystackPop?: any }
}

function loadPaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) return resolve();
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://js.paystack.co/v1/inline.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Paystack")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Paystack"));
    document.head.appendChild(s);
  });
}

export default function ActivationModal({ open, onOpenChange }: ActivationModalProps) {
  const { profile, refreshProfile, user } = useAuth();
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [publicKey, setPublicKey] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.rpc("get_public_payment_settings");
      const row = Array.isArray(data) ? data[0] : data;
      setAmount(Number(row?.activation_amount || 0));
      setPublicKey(row?.paystack_public_key || "");
    })();
  }, [open]);

  const handlePay = async () => {
    if (!whatsappNumber.trim() || whatsappNumber.trim().length < 6) {
      toast({ title: "WhatsApp number required", description: "Enter a valid WhatsApp number first.", variant: "destructive" });
      return;
    }
    if (!publicKey) {
      toast({ title: "Payment unavailable", description: "Paystack is not configured yet. Please contact support.", variant: "destructive" });
      return;
    }
    if (!amount || amount <= 0) {
      toast({ title: "Payment unavailable", description: "Activation amount is not set.", variant: "destructive" });
      return;
    }

    setIsPaying(true);
    try {
      await loadPaystackScript();

      const { data, error } = await supabase.functions.invoke("paystack-init", {
        body: { whatsapp_number: whatsappNumber.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const reference: string = data.reference;

      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: user?.email || profile?.email,
        amount: Math.round(amount * 100),
        currency: "NGN",
        ref: reference,
        metadata: {
          custom_fields: [
            { display_name: "WhatsApp", variable_name: "whatsapp", value: whatsappNumber.trim() },
          ],
        },
        callback: (response: { reference: string }) => {
          (async () => {
            try {
              const { data: v, error: vErr } = await supabase.functions.invoke("paystack-verify", {
                body: { reference: response.reference },
              });
              if (vErr) throw vErr;
              if (v?.error) throw new Error(v.error);
              if (v?.success) {
                toast({
                  title: "Payment received successfully",
                  description: "Your payment is being reviewed. Your activation code will be sent to the WhatsApp number you provided.",
                });
              } else {
                toast({
                  title: "Payment not confirmed",
                  description: "We couldn't verify this payment. Please contact support.",
                  variant: "destructive",
                });
              }
            } catch (e: any) {
              toast({ title: "Verification failed", description: e.message, variant: "destructive" });
            } finally {
              setIsPaying(false);
            }
          })();
        },
        onClose: () => {
          setIsPaying(false);
          toast({
            title: "Payment cancelled",
            description: "Please try again when you are ready.",
          });
        },
      });
      handler.openIframe();
    } catch (e: any) {
      setIsPaying(false);
      toast({ title: "Could not start payment", description: e.message, variant: "destructive" });
    }
  };

  const handleActivation = async () => {
    if (!activationCode.trim() || !profile) {
      toast({ title: "Enter activation code", description: "Please enter your activation code.", variant: "destructive" });
      return;
    }
    setIsActivating(true);
    try {
      const { data, error } = await supabase.functions.invoke("redeem-activation-code", {
        body: { code: activationCode.trim().toUpperCase() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await refreshProfile();
      toast({ title: "Account activated!", description: "Your account is now fully active. Enjoy YTJ Shop Manager!" });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Activation failed", description: error.message || "Could not redeem this code.", variant: "destructive" });
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Account Activation Required
          </DialogTitle>
          <DialogDescription>
            Pay with Paystack, then enter the activation code we send to your WhatsApp to unlock all features.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="payment" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payment" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment
            </TabsTrigger>
            <TabsTrigger value="activate" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Activate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payment" className="space-y-6 mt-4">
            <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-muted-foreground">Activation fee</p>
              <p className="text-3xl font-bold">
                ₦{(amount ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">One-time payment via Paystack</p>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="whatsapp">WhatsApp Number</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="whatsapp"
                    type="tel"
                    placeholder="+234 800 000 0000"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  We'll send your activation code to this number after payment is confirmed.
                </p>
              </div>

              <Button
                onClick={handlePay}
                disabled={isPaying || !whatsappNumber.trim() || !amount}
                className="w-full gradient-primary hover:opacity-90"
              >
                {isPaying ? "Processing..." : "Pay with Paystack"}
                <CreditCard className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="activate" className="space-y-6 mt-4">
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
                <Key className="h-8 w-8 text-success" />
              </div>
              <h4 className="font-semibold text-lg">Enter Activation Code</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Once your payment is verified, you'll receive an activation code via WhatsApp.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="activation-code">Activation Code</Label>
                <Input
                  id="activation-code"
                  type="text"
                  placeholder="XXXX-XXXX-XXXX"
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                  className="mt-1 text-center font-mono text-lg tracking-widest"
                />
              </div>

              <Button
                onClick={handleActivation}
                disabled={isActivating || !activationCode.trim()}
                className="w-full gradient-success hover:opacity-90"
              >
                {isActivating ? "Activating..." : "Activate Account"}
                <CheckCircle2 className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
