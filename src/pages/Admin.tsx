import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Shield,
  Key,
  Receipt,
  Users,
  Plus,
  Copy,
  ExternalLink,
  CheckCircle2,
  Clock,
  Store,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";


interface PaymentReceipt {
  id: string;
  profile_id: string;
  receipt_url: string;
  whatsapp_number: string;
  status: string;
  created_at: string;
  profiles?: {
    business_name: string;
    email: string;
  };
}

interface ActivationCode {
  id: string;
  code: string;
  is_used: boolean;
  used_at: string | null;
  created_at: string;
  used_by: string | null;
}

interface Profile {
  id: string;
  business_name: string;
  email: string;
  status: string;
  activated_at: string | null;
  created_at: string;
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/admin-login", { replace: true });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!data) {
        await supabase.auth.signOut();
        navigate("/admin-login", { replace: true });
        return;
      }
      setIsAdmin(true);
    })();
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const signedUrlFor = async (receiptUrl: string): Promise<string | null> => {
    // receipt_url may be either a legacy public URL or a bare file name
    let path = receiptUrl;
    const marker = "/receipts/";
    const idx = receiptUrl.indexOf(marker);
    if (idx !== -1) path = receiptUrl.substring(idx + marker.length);
    const { data } = await supabase.storage
      .from("receipts")
      .createSignedUrl(path, 60 * 10);
    return data?.signedUrl ?? null;
  };

  const openReceipt = async (receiptUrl: string) => {
    const url = await signedUrlFor(receiptUrl);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      toast({
        title: "Could not open receipt",
        description: "The file could not be located.",
        variant: "destructive",
      });
    }
  };

  const fetchData = async () => {
    const { data: receiptsData } = await supabase
      .from("payment_receipts")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: codesData } = await supabase
      .from("activation_codes")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (receiptsData && profilesData) {
      const mappedReceipts = receiptsData.map((receipt) => ({
        ...receipt,
        profiles: profilesData.find((p) => p.id === receipt.profile_id),
      }));
      setReceipts(mappedReceipts as PaymentReceipt[]);
    }

    if (codesData) setCodes(codesData);
    if (profilesData) setProfiles(profilesData as Profile[]);
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += "-";
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    try {
      const newCode = generateCode();
      const { error } = await supabase.from("activation_codes").insert({ code: newCode });
      if (error) throw error;
      toast({ title: "Code generated", description: `New activation code: ${newCode}` });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error generating code",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: "Activation code copied to clipboard." });
  };

  const handleDeleteUser = async (profileId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete the user "${email}"? This action cannot be undone.`)) return;
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", profileId);
      if (error) throw error;
      toast({ title: "User deleted", description: `${email} has been removed from the system.` });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const pendingCount = profiles.filter((p) => p.status === "pending").length;
  const activeCount = profiles.filter((p) => p.status === "active").length;
  const unusedCodes = codes.filter((c) => !c.is_used).length;

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-xl animate-scale-in">
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-glow mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle>Admin Portal</CardTitle>
            <CardDescription>
              {user
                ? "Your account does not have admin access."
                : "You must sign in with an admin account to continue."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!user && (
              <Button
                className="w-full gradient-primary hover:opacity-90"
                onClick={() => navigate("/auth")}
              >
                Sign In
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold">Admin Portal</h1>
              <p className="text-xs text-muted-foreground">Ruto Shop Manager</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            <Store className="mr-2 h-4 w-4" />
            Back to App
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{profiles.length}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeCount}</p>
                  <p className="text-sm text-muted-foreground">Active Accounts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-sm text-muted-foreground">Pending Activation</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-info/10">
                  <Key className="h-6 w-6 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{unusedCodes}</p>
                  <p className="text-sm text-muted-foreground">Available Codes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="receipts" className="space-y-6">
          <TabsList>
            <TabsTrigger value="receipts" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Payment Receipts
            </TabsTrigger>
            <TabsTrigger value="codes" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Activation Codes
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
          </TabsList>

          {/* Payment Receipts */}
          <TabsContent value="receipts">
            <Card>
              <CardHeader>
                <CardTitle>Payment Receipts</CardTitle>
                <CardDescription>
                  Review submitted payment proofs from users
                </CardDescription>
              </CardHeader>
              <CardContent>
                {receipts.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No receipts submitted yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Business</TableHead>
                          <TableHead>WhatsApp</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Receipt</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {receipts.map((receipt) => (
                          <TableRow key={receipt.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {receipt.profiles?.business_name || "Unknown"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {receipt.profiles?.email || ""}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <a
                                href={`https://wa.me/${receipt.whatsapp_number.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {receipt.whatsapp_number}
                              </a>
                            </TableCell>
                            <TableCell>
                              {format(new Date(receipt.created_at), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  receipt.status === "pending"
                                    ? "secondary"
                                    : "default"
                                }
                              >
                                {receipt.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openReceipt(receipt.receipt_url)}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </TableCell>

                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activation Codes */}
          <TabsContent value="codes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Activation Codes</CardTitle>
                  <CardDescription>
                    Generate and manage activation codes
                  </CardDescription>
                </div>
                <Button
                  onClick={handleGenerateCode}
                  disabled={isGenerating}
                  className="gradient-primary hover:opacity-90"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Code
                </Button>
              </CardHeader>
              <CardContent>
                {codes.length === 0 ? (
                  <div className="text-center py-12">
                    <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No codes generated yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Used At</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {codes.map((code) => (
                          <TableRow key={code.id}>
                            <TableCell className="font-mono font-medium">
                              {code.code}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={code.is_used ? "secondary" : "default"}
                                className={
                                  !code.is_used
                                    ? "bg-success text-success-foreground"
                                    : ""
                                }
                              >
                                {code.is_used ? "Used" : "Available"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(code.created_at), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              {code.used_at
                                ? format(new Date(code.used_at), "MMM d, yyyy")
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {!code.is_used && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyCode(code.code)}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Registered Users</CardTitle>
                <CardDescription>
                  View all registered business accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profiles.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No users registered yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Business</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Registered</TableHead>
                          <TableHead>Activated</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profiles.map((profile) => (
                          <TableRow key={profile.id}>
                            <TableCell className="font-medium">
                              {profile.business_name}
                            </TableCell>
                            <TableCell>{profile.email}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  profile.status === "active"
                                    ? "default"
                                    : "secondary"
                                }
                                className={
                                  profile.status === "active"
                                    ? "bg-success text-success-foreground"
                                    : ""
                                }
                              >
                                {profile.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(profile.created_at), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              {profile.activated_at
                                ? format(
                                    new Date(profile.activated_at),
                                    "MMM d, yyyy"
                                  )
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteUser(profile.id, profile.email)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
