-- Karena Supabase semakin ketat dengan "Email Rate Limit" dan melarang penggunaan email palsu,
-- Kita beralih ke Custom Auth (Sistem Login Mandiri) menggunakan tabel mahasiswa.

ALTER TABLE students ADD COLUMN IF NOT EXISTS password TEXT;
