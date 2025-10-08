import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface Patient {
  id: string;
  patient_id: string;
  full_name: string;
  status: string;
  admission_date: string;
  blood_type: string | null;
}

const PatientsView = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("admission_date", { ascending: false })
        .limit(10);

      if (!error && data) {
        setPatients(data);
      }
      setLoading(false);
    };

    fetchPatients();

    const channel = supabase
      .channel("patients-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, fetchPatients)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "discharged":
        return "secondary";
      case "transferred":
        return "warning";
      default:
        return "secondary";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Patients</CardTitle>
        <CardDescription>Latest patient admissions and status</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading patients...</div>
        ) : patients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No patients found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Blood Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Admitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-mono text-sm">{patient.patient_id}</TableCell>
                  <TableCell className="font-medium">{patient.full_name}</TableCell>
                  <TableCell>{patient.blood_type || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(patient.status) as any}>
                      {patient.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(patient.admission_date), { addSuffix: true })}
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

export default PatientsView;
