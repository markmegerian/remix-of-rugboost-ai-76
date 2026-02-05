-- Add staff role for Google user
INSERT INTO public.user_roles (user_id, role)
VALUES ('5b5f6d8b-4d0c-419a-9c48-e0f3233e80c0', 'staff')
ON CONFLICT (user_id, role) DO NOTHING;