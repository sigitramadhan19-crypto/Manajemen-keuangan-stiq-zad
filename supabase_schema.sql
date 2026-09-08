-- ============================================
-- STIQ ZAD Financial Management - Database Schema
-- Copy-paste seluruh file ini ke Supabase SQL Editor lalu klik Run
-- ============================================

-- ============================================
-- 1. TABLES
-- ============================================

-- Students (Data Mahasiswa)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nim TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  whatsapp TEXT,
  program TEXT NOT NULL CHECK (program IN ('Reguler Asrama', 'Non-Asrama', 'Beasiswa')),
  year INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Cuti', 'Lulus', 'Keluar')),
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  fee_profile_id UUID REFERENCES fee_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fee Profiles (Master Biaya)
CREATE TABLE IF NOT EXISTS fee_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Bulanan', 'Tahunan', 'Sekali Bayar')),
  amount BIGINT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bills (Tagihan)
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_profile_id UUID NOT NULL REFERENCES fee_profiles(id) ON DELETE RESTRICT,
  period TEXT NOT NULL,
  due_date DATE NOT NULL,
  amount BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'belum bayar' CHECK (status IN ('belum bayar', 'sebagian', 'lunas')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments (Pembayaran)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number TEXT UNIQUE NOT NULL,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('Transfer BSI', 'Tunai', 'Virtual Account', 'Transfer Mandiri')),
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  notes TEXT,
  verified_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 2. INDEXES (untuk performa query)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_students_nim ON students(nim);
CREATE INDEX IF NOT EXISTS idx_students_program ON students(program);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);

CREATE INDEX IF NOT EXISTS idx_fee_profiles_category ON fee_profiles(category);
CREATE INDEX IF NOT EXISTS idx_fee_profiles_is_active ON fee_profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_bills_student_id ON bills(student_id);
CREATE INDEX IF NOT EXISTS idx_bills_fee_profile_id ON bills(fee_profile_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_period ON bills(period);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date);
CREATE INDEX IF NOT EXISTS idx_bills_invoice_number ON bills(invoice_number);

CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_number ON payments(transaction_number);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- 3. UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER fee_profiles_updated_at
  BEFORE UPDATE ON fee_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER bills_updated_at
  BEFORE UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 4. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated user policies
CREATE POLICY "Allow authenticated read students" ON students
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert students" ON students
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update students" ON students
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete students" ON students
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read fee_profiles" ON fee_profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert fee_profiles" ON fee_profiles
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update fee_profiles" ON fee_profiles
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete fee_profiles" ON fee_profiles
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read bills" ON bills
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert bills" ON bills
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update bills" ON bills
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete bills" ON bills
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read payments" ON payments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert payments" ON payments
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update payments" ON payments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read audit_logs" ON audit_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert audit_logs" ON audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- Anon policies for development (REMOVE IN PRODUCTION)
CREATE POLICY "Allow anon read students" ON students FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read fee_profiles" ON fee_profiles FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read bills" ON bills FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read payments" ON payments FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read audit_logs" ON audit_logs FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert students" ON students FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update students" ON students FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete students" ON students FOR DELETE TO anon USING (true);

CREATE POLICY "Allow anon insert fee_profiles" ON fee_profiles FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update fee_profiles" ON fee_profiles FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete fee_profiles" ON fee_profiles FOR DELETE TO anon USING (true);

CREATE POLICY "Allow anon insert bills" ON bills FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update bills" ON bills FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete bills" ON bills FOR DELETE TO anon USING (true);

CREATE POLICY "Allow anon insert payments" ON payments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update payments" ON payments FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon insert audit_logs" ON audit_logs FOR INSERT TO anon WITH CHECK (true);

-- ============================================
-- 5. SEED DATA
-- ============================================

INSERT INTO students (id, nim, name, email, whatsapp, program, year, status) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567801', '220101001', 'Ahmad Fathan', 'ahmad.fathan@stiqzad.ac.id', '081234567001', 'Reguler Asrama', 2022, 'Aktif'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567802', '220101045', 'Budi Santoso', 'budi.santoso@stiqzad.ac.id', '081234567002', 'Non-Asrama', 2022, 'Aktif'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567803', '220101088', 'Cahya Ningsih', 'cahya.ningsih@stiqzad.ac.id', '081234567003', 'Reguler Asrama', 2022, 'Cuti'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567804', '230102015', 'Dewi Rahmawati', 'dewi.rahmawati@stiqzad.ac.id', '081234567004', 'Beasiswa', 2023, 'Aktif'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567805', '230102030', 'Eko Prasetyo', 'eko.prasetyo@stiqzad.ac.id', '081234567005', 'Reguler Asrama', 2023, 'Aktif')
ON CONFLICT (nim) DO NOTHING;

INSERT INTO fee_profiles (id, name, category, amount, is_active) VALUES
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567801', 'SPP Asrama', 'Bulanan', 1500000, true),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567802', 'SPP Non-Asrama', 'Bulanan', 850000, true),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567803', 'Uang Pangkal', 'Sekali Bayar', 5000000, true),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567804', 'Uang Kegiatan Mahasiswa', 'Tahunan', 250000, true)
ON CONFLICT DO NOTHING;

INSERT INTO bills (id, invoice_number, student_id, fee_profile_id, period, due_date, amount, status) VALUES
  ('c1b2c3d4-e5f6-7890-abcd-ef1234567801', 'INV-202608-001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'b1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Agustus 2026', '2026-08-10', 1500000, 'lunas'),
  ('c1b2c3d4-e5f6-7890-abcd-ef1234567802', 'INV-202608-002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'b1b2c3d4-e5f6-7890-abcd-ef1234567802', 'Agustus 2026', '2026-08-10', 850000, 'belum bayar'),
  ('c1b2c3d4-e5f6-7890-abcd-ef1234567803', 'INV-202608-003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'b1b2c3d4-e5f6-7890-abcd-ef1234567803', 'Agustus 2026', '2026-08-15', 5000000, 'sebagian'),
  ('c1b2c3d4-e5f6-7890-abcd-ef1234567804', 'INV-202608-004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'b1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Agustus 2026', '2026-08-10', 1500000, 'lunas'),
  ('c1b2c3d4-e5f6-7890-abcd-ef1234567805', 'INV-202608-005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'b1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Agustus 2026', '2026-08-10', 1500000, 'belum bayar'),
  ('c1b2c3d4-e5f6-7890-abcd-ef1234567806', 'INV-202608-006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'b1b2c3d4-e5f6-7890-abcd-ef1234567804', 'Agustus 2026', '2026-09-15', 250000, 'belum bayar'),
  ('c1b2c3d4-e5f6-7890-abcd-ef1234567807', 'INV-202607-001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'b1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Juli 2026', '2026-07-10', 1500000, 'lunas'),
  ('c1b2c3d4-e5f6-7890-abcd-ef1234567808', 'INV-202607-002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'b1b2c3d4-e5f6-7890-abcd-ef1234567802', 'Juli 2026', '2026-07-10', 850000, 'lunas'),
  ('c1b2c3d4-e5f6-7890-abcd-ef1234567809', 'INV-202607-003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'b1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Juli 2026', '2026-07-10', 1500000, 'lunas'),
  ('c1b2c3d4-e5f6-7890-abcd-ef1234567810', 'INV-202607-004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'b1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Juli 2026', '2026-07-10', 1500000, 'lunas')
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO payments (id, transaction_number, bill_id, amount, method, status, notes, created_at) VALUES
  ('d1b2c3d4-e5f6-7890-abcd-ef1234567801', 'TRX-260817-001', 'c1b2c3d4-e5f6-7890-abcd-ef1234567801', 1500000, 'Transfer BSI', 'verified', 'Pembayaran SPP Agustus', '2026-08-17 09:15:00+07'),
  ('d1b2c3d4-e5f6-7890-abcd-ef1234567802', 'TRX-260816-042', 'c1b2c3d4-e5f6-7890-abcd-ef1234567803', 2000000, 'Transfer Mandiri', 'pending', 'Cicilan pertama uang pangkal', '2026-08-16 14:30:00+07'),
  ('d1b2c3d4-e5f6-7890-abcd-ef1234567803', 'TRX-260816-015', 'c1b2c3d4-e5f6-7890-abcd-ef1234567804', 1500000, 'Tunai', 'verified', NULL, '2026-08-16 10:05:00+07'),
  ('d1b2c3d4-e5f6-7890-abcd-ef1234567804', 'TRX-260710-001', 'c1b2c3d4-e5f6-7890-abcd-ef1234567807', 1500000, 'Transfer BSI', 'verified', NULL, '2026-07-08 10:00:00+07'),
  ('d1b2c3d4-e5f6-7890-abcd-ef1234567805', 'TRX-260710-002', 'c1b2c3d4-e5f6-7890-abcd-ef1234567808', 850000, 'Tunai', 'verified', NULL, '2026-07-09 11:00:00+07'),
  ('d1b2c3d4-e5f6-7890-abcd-ef1234567806', 'TRX-260710-003', 'c1b2c3d4-e5f6-7890-abcd-ef1234567809', 1500000, 'Transfer BSI', 'verified', NULL, '2026-07-08 14:00:00+07'),
  ('d1b2c3d4-e5f6-7890-abcd-ef1234567807', 'TRX-260710-004', 'c1b2c3d4-e5f6-7890-abcd-ef1234567810', 1500000, 'Virtual Account', 'verified', NULL, '2026-07-10 09:30:00+07')
ON CONFLICT (transaction_number) DO NOTHING;

-- ============================================
-- DONE! Check Table Editor to verify.
-- ============================================
-- ============================================
-- TRIGGER: Update Bill Status automatically
-- ============================================

CREATE OR REPLACE FUNCTION update_bill_status_after_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_bill_id UUID;
  v_total_paid BIGINT;
  v_bill_amount BIGINT;
BEGIN
  -- Determine the bill_id depending on the operation
  IF TG_OP = 'DELETE' THEN
    v_bill_id := OLD.bill_id;
  ELSE
    v_bill_id := NEW.bill_id;
  END IF;

  -- Get total verified payments for this bill
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments
  WHERE bill_id = v_bill_id AND status = 'verified';

  -- Get the bill's total amount
  SELECT amount INTO v_bill_amount
  FROM bills
  WHERE id = v_bill_id;

  -- Update the bill status
  IF v_total_paid = 0 THEN
    UPDATE bills SET status = 'belum bayar' WHERE id = v_bill_id;
  ELSIF v_total_paid >= v_bill_amount THEN
    UPDATE bills SET status = 'lunas' WHERE id = v_bill_id;
  ELSE
    UPDATE bills SET status = 'sebagian' WHERE id = v_bill_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bill_status ON payments;

CREATE TRIGGER trigger_update_bill_status
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_bill_status_after_payment();
