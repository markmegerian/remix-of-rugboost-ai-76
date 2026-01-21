-- Add payment information fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'bank_transfer',
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS bank_account_number text,
ADD COLUMN IF NOT EXISTS bank_routing_number text,
ADD COLUMN IF NOT EXISTS paypal_email text,
ADD COLUMN IF NOT EXISTS venmo_handle text,
ADD COLUMN IF NOT EXISTS zelle_email text,
ADD COLUMN IF NOT EXISTS payment_notes text;