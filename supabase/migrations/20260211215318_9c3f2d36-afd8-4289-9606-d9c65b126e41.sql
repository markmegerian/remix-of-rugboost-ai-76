
-- Prevent a user from having both 'staff' and 'client' roles simultaneously.
-- If inserting 'staff', block if 'client' exists (and vice versa).
CREATE OR REPLACE FUNCTION public.prevent_conflicting_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'staff' THEN
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'client') THEN
      RAISE EXCEPTION 'Cannot assign staff role to a user who already has the client role';
    END IF;
  ELSIF NEW.role = 'client' THEN
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'staff') THEN
      RAISE EXCEPTION 'Cannot assign client role to a user who already has the staff role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_conflicting_roles
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_conflicting_roles();
