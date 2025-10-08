import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface BillingRecord {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  service_description: string;
  billing_date: string;
  due_date: string;
  patients: {
    full_name: string;
    patient_id: string;
  };
}

const BillingView = () => {
  const [billing, setBilling] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBilling = async () => {
      const { data, error } = await supabase
        .from("billing")
        .select(`
          *,
          patients:patient_id (
            full_name,
            patient_id
          )
        `)
        .order("billing_date", { ascending: false })
        .limit(15);

      if (!error && data) {
        setBilling(data as any);
      }
      setLoading(false);
    };

    fetchBilling();

    const channel = supabase
      .channel("billing-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "billing" }, fetchBilling)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "success";
      case "pending":
        return "warning";
      case "overdue":
        return "destructive";
      case "cancelled":
        return "secondary";
      default:
        return "secondary";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing & Invoices</CardTitle>
        <CardDescription>Recent billing records and payment status</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading billing records...</div>
        ) : billing.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No billing records found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billing.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-mono text-sm">{bill.invoice_number}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{bill.patients.full_name}</div>
                      <div className="text-xs text-muted-foreground">{bill.patients.patient_id}</div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{bill.service_description}</TableCell>
                  <TableCell className="font-semibold">${bill.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(bill.status) as any}>{bill.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(bill.billing_date), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default BillingView;
