import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BANK_DETAILS } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Copy, Upload, Phone, CheckCircle2, AlertCircle, CreditCard, Key } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ActivationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ActivationModal({ open, onOpenChange }: ActivationModalProps) {
  const { profile, refreshProfile } = useAuth();
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [activationCode, setActivationCode] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const handleReceiptUpload = async () => {
    if (!receiptFile || !whatsappNumber || !profile) {
      toast({
        title: "Missing information",
        description: "Please upload a receipt and enter your WhatsApp number.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, receiptFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("receipts")
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from("payment_receipts")
        .insert({
          profile_id: profile.id,
          receipt_url: publicUrl,
          whatsapp_number: whatsappNumber,
        });

      if (insertError) throw insertError;

      toast({
        title: "Receipt uploaded!",
        description: "Your payment receipt has been submitted. We'll review it shortly.",
      });

      setReceiptFile(null);
      setWhatsappNumber("");
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleActivation = async () => {
    if (!activationCode.trim() || !profile) {
      toast({
        title: "Enter activation code",
        description: "Please enter your activation code.",
        variant: "destructive",
      });
      return;
    }

    setIsActivating(true);

    try {
      // Check if code exists and is unused
      const { data: codeData, error: codeError } = await supabase
        .from("activation_codes")
        .select("*")
        .eq("code", activationCode.trim().toUpperCase())
        .eq("is_used", false)
        .maybeSingle();

      if (codeError) throw codeError;

      if (!codeData) {
        toast({
          title: "Invalid code",
          description: "This activation code is invalid or has already been used.",
          variant: "destructive",
        });
        setIsActivating(false);
        return;
      }

      // Mark code as used
      const { error: updateCodeError } = await supabase
        .from("activation_codes")
        .update({
          is_used: true,
          used_by: profile.id,
          used_at: new Date().toISOString(),
        })
        .eq("id", codeData.id);

      if (updateCodeError) throw updateCodeError;

      // Update profile status
      const { error: updateProfileError } = await supabase
        .from("profiles")
        .update({
          status: "active",
          activated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (updateProfileError) throw updateProfileError;

      await refreshProfile();

      toast({
        title: "Account activated!",
        description: "Your account is now fully active. Enjoy ShopManager Pro!",
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Activation failed",
        description: error.message,
        variant: "destructive",
      });
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
            Complete the payment and enter your activation code to unlock all features.
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
            {/* Bank Details */}
            <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Bank Details
              </h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Account Name:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{BANK_DETAILS.accountName}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(BANK_DETAILS.accountName, "Account name")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Account Number:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium font-mono">{BANK_DETAILS.accountNumber}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(BANK_DETAILS.accountNumber, "Account number")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Bank:</span>
                  <span className="font-medium">{BANK_DETAILS.bankName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Branch Code:</span>
                  <span className="font-medium font-mono">{BANK_DETAILS.branchCode}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Reference:</span>
                  <span className="font-medium">{profile?.business_name || "Your Business Name"}</span>
                </div>
              </div>
            </div>

            {/* Upload Receipt */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                Upload Payment Proof
              </h4>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="whatsapp">WhatsApp Number</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="whatsapp"
                      type="tel"
                      placeholder="+27 12 345 6789"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="receipt">Payment Receipt</Label>
                  <Input
                    id="receipt"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={handleReceiptUpload}
                  disabled={isUploading || !receiptFile || !whatsappNumber}
                  className="w-full"
                >
                  {isUploading ? "Uploading..." : "Submit Payment Proof"}
                  <Upload className="ml-2 h-4 w-4" />
                </Button>
              </div>
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
