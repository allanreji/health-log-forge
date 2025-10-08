import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Activity, Shield, Database, Users } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 mb-16">
          <div className="flex items-center justify-center gap-3">
            <Activity className="h-12 w-12 text-primary" />
            <h1 className="text-5xl font-bold">HealthCare ERP</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Enterprise Resource Planning system for healthcare facilities with integrated UNIX system logs for comprehensive network monitoring and security
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate("/auth")} size="lg">
              Get Started
            </Button>
            <Button onClick={() => navigate("/auth")} variant="outline" size="lg">
              Sign In
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-card p-6 rounded-lg border shadow-sm">
            <Users className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Patient Management</h3>
            <p className="text-muted-foreground">
              Comprehensive patient records, admissions, and medical history tracking with real-time updates
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg border shadow-sm">
            <Database className="h-10 w-10 text-secondary mb-4" />
            <h3 className="text-xl font-semibold mb-2">System Logs</h3>
            <p className="text-muted-foreground">
              Monitor UNIX system logs in real-time to track system health and detect security anomalies
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg border shadow-sm">
            <Shield className="h-10 w-10 text-info mb-4" />
            <h3 className="text-xl font-semibold mb-2">Network Security</h3>
            <p className="text-muted-foreground">
              Advanced network monitoring with threat detection and automated security breach prevention
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
