import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Store,
  ArrowRight,
  Package,
  ShoppingCart,
  BarChart3,
  Receipt,
  Shield,
  CheckCircle2,
} from "lucide-react";

export default function Index() {
  const { user } = useAuth();

  const features = [
    {
      icon: Package,
      title: "Inventory Management",
      description: "Add, update, and track your shop items with ease",
    },
    {
      icon: ShoppingCart,
      title: "Point of Sale",
      description: "Process sales quickly with our intuitive interface",
    },
    {
      icon: Receipt,
      title: "Printable Receipts",
      description: "Generate professional receipts for every transaction",
    },
    {
      icon: BarChart3,
      title: "Sales Analytics",
      description: "Track your performance with detailed reports",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Store className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Ruto Shop Manager</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/admin-login">
                <Shield className="mr-2 h-4 w-4" />
                Admin Portal
              </Link>
            </Button>
            {user ? (
              <Button asChild className="gradient-primary hover:opacity-90">
                <Link to="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild className="gradient-primary hover:opacity-90">
                <Link to="/auth">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-3xl" />

        <div className="container mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 mb-6 animate-fade-in">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Trusted by 500+ businesses</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-foreground max-w-4xl mx-auto leading-tight animate-slide-up">
            Manage Your Shop
            <span className="block gradient-primary bg-clip-text text-transparent">
              Like a Pro
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mt-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
            The all-in-one solution for inventory management, point of sale, and business analytics. Start growing your business today.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <Button size="lg" asChild className="gradient-primary hover:opacity-90 shadow-glow">
              <Link to="/auth">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/admin-login">
                Admin Portal
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Everything You Need
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Powerful features to help you run your business efficiently
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="bg-card rounded-2xl p-6 shadow-lg card-hover animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="bg-card rounded-3xl p-8 md:p-16 text-center relative overflow-hidden shadow-xl">
            <div className="absolute inset-0 gradient-hero opacity-5" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                Join hundreds of businesses already using Ruto Shop Manager to streamline their operations.
              </p>
              <Button size="lg" asChild className="gradient-success hover:opacity-90">
                <Link to="/auth">
                  Create Your Account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <span className="font-semibold">Ruto Shop Manager</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} RutoShopManager. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
