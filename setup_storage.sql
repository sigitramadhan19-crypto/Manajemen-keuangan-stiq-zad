-- ============================================
-- STORAGE SETUP FOR PAYMENT PROOFS
-- ============================================

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment_proofs', 'payment_proofs', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Setup Security Policies for the bucket
-- Allow anyone to read (so admin and students can see the proofs)
CREATE POLICY "Public Access payment_proofs" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'payment_proofs');

-- Allow authenticated users to upload files
CREATE POLICY "Auth Upload payment_proofs" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'payment_proofs' AND auth.role() = 'authenticated');
