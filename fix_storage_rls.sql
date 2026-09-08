-- Fix for storage bucket RLS
-- Allows anonymous users (students) to upload payment proofs

DROP POLICY IF EXISTS "Auth Upload payment_proofs" ON storage.objects;

CREATE POLICY "Anon Upload payment_proofs" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'payment_proofs' AND (auth.role() = 'authenticated' OR auth.role() = 'anon'));
