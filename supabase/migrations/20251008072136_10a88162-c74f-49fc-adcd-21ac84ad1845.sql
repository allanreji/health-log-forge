-- Create enum types
CREATE TYPE public.app_role AS ENUM ('admin', 'doctor', 'nurse', 'staff');
CREATE TYPE public.log_level AS ENUM ('info', 'warning', 'error', 'critical');
CREATE TYPE public.patient_status AS ENUM ('active', 'discharged', 'transferred');
CREATE TYPE public.bill_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');

-- Create user roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create patients table
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  blood_type TEXT,
  allergies TEXT,
  status patient_status NOT NULL DEFAULT 'active',
  admission_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  discharge_date TIMESTAMPTZ,
  assigned_doctor_id UUID REFERENCES auth.users(id),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Create billing table
CREATE TABLE public.billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status bill_status NOT NULL DEFAULT 'pending',
  service_description TEXT NOT NULL,
  billing_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date TIMESTAMPTZ NOT NULL,
  paid_date TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.billing ENABLE ROW LEVEL SECURITY;

-- Create system_logs table for UNIX logs
CREATE TABLE public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL,
  level log_level NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_id UUID REFERENCES auth.users(id),
  is_anomaly BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_system_logs_timestamp ON public.system_logs(timestamp DESC);
CREATE INDEX idx_system_logs_level ON public.system_logs(level);
CREATE INDEX idx_system_logs_anomaly ON public.system_logs(is_anomaly) WHERE is_anomaly = true;

-- Create network_events table
CREATE TABLE public.network_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL,
  source_ip TEXT NOT NULL,
  destination_ip TEXT,
  port INTEGER,
  protocol TEXT,
  bytes_transferred BIGINT,
  status TEXT,
  is_suspicious BOOLEAN DEFAULT false,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.network_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_network_events_timestamp ON public.network_events(timestamp DESC);
CREATE INDEX idx_network_events_suspicious ON public.network_events(is_suspicious) WHERE is_suspicious = true;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    new.email
  );
  
  -- Assign default staff role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'staff');
  
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for patients
CREATE POLICY "Authenticated users can view patients"
  ON public.patients FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can create patients"
  ON public.patients FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can update patients"
  ON public.patients FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for billing
CREATE POLICY "Authenticated users can view billing"
  ON public.billing FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can create billing"
  ON public.billing FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can update billing"
  ON public.billing FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for system_logs
CREATE POLICY "Admins can view all logs"
  ON public.system_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert logs"
  ON public.system_logs FOR INSERT
  WITH CHECK (true);

-- RLS Policies for network_events
CREATE POLICY "Admins can view network events"
  ON public.network_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert network events"
  ON public.network_events FOR INSERT
  WITH CHECK (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.network_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.billing;