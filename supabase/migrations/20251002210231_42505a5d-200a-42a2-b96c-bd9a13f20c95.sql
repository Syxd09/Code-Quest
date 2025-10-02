-- Break RLS recursion and grant admins proper participant management

-- 1) Add denormalized admin_id on participants to avoid cross-table lookups
ALTER TABLE public.participants
ADD COLUMN IF NOT EXISTS admin_id uuid;

-- 2) Trigger to keep admin_id in sync with the participant's game
CREATE OR REPLACE FUNCTION public.set_participant_admin_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT admin_id INTO NEW.admin_id FROM public.games WHERE id = NEW.game_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_participant_admin_id ON public.participants;
CREATE TRIGGER trg_set_participant_admin_id
BEFORE INSERT OR UPDATE OF game_id ON public.participants
FOR EACH ROW EXECUTE FUNCTION public.set_participant_admin_id();

-- 3) Backfill existing rows
UPDATE public.participants p
SET admin_id = g.admin_id
FROM public.games g
WHERE p.game_id = g.id AND (p.admin_id IS DISTINCT FROM g.admin_id OR p.admin_id IS NULL);

-- 4) Replace participants SELECT policy to remove dependency on games
DROP POLICY IF EXISTS "Game participants can view participants" ON public.participants;

CREATE POLICY "Participants and admins can view participants"
ON public.participants
FOR SELECT
USING (
  user_id = auth.uid()::text
  OR admin_id = auth.uid()
);

-- 5) Allow admins to UPDATE participants in their games
DROP POLICY IF EXISTS "Admins can update participants" ON public.participants;
CREATE POLICY "Admins can update participants"
ON public.participants
FOR UPDATE
USING (admin_id = auth.uid())
WITH CHECK (admin_id = auth.uid());

-- 6) Allow admins to DELETE participants in their games
DROP POLICY IF EXISTS "Admins can delete participants" ON public.participants;
CREATE POLICY "Admins can delete participants"
ON public.participants
FOR DELETE
USING (admin_id = auth.uid());