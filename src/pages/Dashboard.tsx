import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Activity, Users, DollarSign, AlertTriangle, LogOut, Shield, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import PatientsView from "@/components/dashboard/PatientsView";
import SystemLogsView from "@/components/dashboard/SystemLogsView";
import NetworkMonitorView from "@/components/dashboard/NetworkMonitorView";
import BillingView from "@/components/dashboard/BillingView";
import DashboardStats from "@/components/dashboard/DashboardStats";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Activity className="h-12 w-12 animate-pulse text-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">HealthCare ERP</h1>
              <p className="text-sm text-muted-foreground">Network Monitoring & Patient Management</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <DashboardStats />

        <Tabs defaultValue="patients" className="mt-8">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="patients">
              <Users className="h-4 w-4 mr-2" />
              Patients
            </TabsTrigger>
            <TabsTrigger value="billing">
              <DollarSign className="h-4 w-4 mr-2" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Database className="h-4 w-4 mr-2" />
              System Logs
            </TabsTrigger>
            <TabsTrigger value="network">
              <Shield className="h-4 w-4 mr-2" />
              Network
            </TabsTrigger>
          </TabsList>

          <TabsContent value="patients" className="mt-6">
            <PatientsView />
          </TabsContent>

          <TabsContent value="billing" className="mt-6">
            <BillingView />
          </TabsContent>

          <TabsContent value="logs" className="mt-6">
            <SystemLogsView />
          </TabsContent>

          <TabsContent value="network" className="mt-6">
            <NetworkMonitorView />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
