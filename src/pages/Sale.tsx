import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Receipt,
  Printer,
  Download,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface Item {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
}

interface CartItem {
  item: Item;
  quantity: number;
}

export default function Sale() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !profile) {
      navigate("/auth");
    }
    if (!loading && profile?.status !== "active") {
      navigate("/dashboard");
    }
  }, [profile, loading, navigate]);

  useEffect(() => {
    if (profile?.status === "active") {
      fetchItems();
    }
  }, [profile]);

  const fetchItems = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("profile_id", profile.id)
      .gt("quantity", 0)
      .order("name");

    if (!error) {
      setItems(data || []);
    }
  };

  const addToCart = (item: Item) => {
    const existingIndex = cart.findIndex((ci) => ci.item.id === item.id);

    if (existingIndex >= 0) {
      const newCart = [...cart];
      if (newCart[existingIndex].quantity < item.quantity) {
        newCart[existingIndex].quantity += 1;
        setCart(newCart);
      } else {
        toast({
          title: "Stock limit reached",
          description: `Only ${item.quantity} ${item.name}(s) available.`,
          variant: "destructive",
        });
      }
    } else {
      setCart([...cart, { item, quantity: 1 }]);
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    const newCart = [...cart];
    const newQuantity = newCart[index].quantity + delta;

    if (newQuantity <= 0) {
      newCart.splice(index, 1);
    } else if (newQuantity <= newCart[index].item.quantity) {
      newCart[index].quantity = newQuantity;
    } else {
      toast({
        title: "Stock limit reached",
        description: `Only ${newCart[index].item.quantity} available.`,
        variant: "destructive",
      });
      return;
    }

    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const totalAmount = cart.reduce(
    (sum, ci) => sum + ci.item.price * ci.quantity,
    0
  );

  const handleCheckout = async () => {
    if (!profile || cart.length === 0) return;

    setIsProcessing(true);

    try {
      // Create sale record
      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .insert({
          profile_id: profile.id,
          total_amount: totalAmount,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItems = cart.map((ci) => ({
        sale_id: saleData.id,
        item_id: ci.item.id,
        item_name: ci.item.name,
        quantity: ci.quantity,
        unit_price: ci.item.price,
        total_price: ci.item.price * ci.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Update inventory quantities
      for (const ci of cart) {
        await supabase
          .from("items")
          .update({ quantity: ci.item.quantity - ci.quantity })
          .eq("id", ci.item.id);
      }

      setLastSaleId(saleData.id);
      setShowReceipt(true);

      toast({
        title: "Sale completed!",
        description: "Receipt has been generated.",
      });
    } catch (error: any) {
      toast({
        title: "Error processing sale",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [80, 200],
      });

      const imgWidth = 70;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 5, 5, imgWidth, imgHeight);
      pdf.save(`receipt-${new Date().toISOString().slice(0, 10)}.pdf`);

      toast({
        title: "PDF downloaded",
        description: "Receipt has been saved as PDF.",
      });
    } catch (error) {
      toast({
        title: "Error generating PDF",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNewSale = () => {
    setCart([]);
    setShowReceipt(false);
    setLastSaleId(null);
    fetchItems();
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentDate = new Date();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (showReceipt) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex justify-between items-center no-print">
            <h1 className="text-2xl font-bold">Sale Complete</h1>
            <Button onClick={handleNewSale}>New Sale</Button>
          </div>

          {/* Receipt */}
          <Card className="receipt-container">
            <div ref={receiptRef} className="p-6 bg-white text-black">
              <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-4">
                <h2 className="text-xl font-bold">{profile?.business_name}</h2>
                <p className="text-sm text-gray-600">Sales Receipt</p>
              </div>

              <div className="space-y-2 text-sm">
                {cart.map((ci, index) => (
                  <div key={index} className="flex justify-between">
                    <div className="flex-1">
                      <span>{ci.item.name}</span>
                      <span className="text-gray-500 ml-2">x{ci.quantity}</span>
                    </div>
                    <span>₦{(ci.item.price * ci.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-gray-300 mt-4 pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>TOTAL</span>
                  <span>₦{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="text-center mt-6 text-xs text-gray-500">
                <p>{currentDate.toLocaleDateString()}</p>
                <p>{currentDate.toLocaleTimeString()}</p>
                <p className="mt-2">Thank you for your purchase!</p>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 no-print">
            <Button onClick={handlePrint} variant="outline" className="flex-1">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="flex-1 gradient-primary hover:opacity-90"
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">New Sale</h1>
          <p className="text-muted-foreground mt-1">
            Search for items and add them to the cart
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Items Search */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer card-hover"
                  onClick={() => addToCart(item)}
                >
                  <CardContent className="p-4">
                    <h3 className="font-semibold truncate">{item.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {item.description || "No description"}
                    </p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-bold text-primary">
                        ₦{Number(item.price).toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Stock: {item.quantity}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="w-full mt-3"
                      variant="secondary"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {filteredItems.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "No items match your search"
                      : "No items in stock"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Cart */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Cart ({cart.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Cart is empty</p>
                    <p className="text-sm">Click on items to add them</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((ci, index) => (
                      <div
                        key={ci.item.id}
                        className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{ci.item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ₦{Number(ci.item.price).toLocaleString()} each
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(index, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">
                            {ci.quantity}
                          </span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(index, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeFromCart(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="border-t pt-4">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span>₦{totalAmount.toLocaleString()}</span>
                      </div>
                    </div>

                    <Button
                      className="w-full gradient-success hover:opacity-90"
                      size="lg"
                      onClick={handleCheckout}
                      disabled={isProcessing}
                    >
                      {isProcessing ? "Processing..." : "Complete Sale"}
                      <Receipt className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
