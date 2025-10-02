-- Fix infinite recursion in RLS policies by using security definer functions

-- 1. Create helper function to check if user is game admin (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_game_admin(p_game_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM games
    WHERE id = p_game_id
    AND admin_id = p_user_id
  );
$$;

-- 2. Create helper function to check if user is game participant (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_game_participant(p_game_id uuid, p_user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM participants
    WHERE game_id = p_game_id
    AND user_id = p_user_id
  );
$$;

-- 3. Fix games SELECT policies using the helper function
DROP POLICY IF EXISTS "Participants can view their games" ON public.games;

CREATE POLICY "Participants can view their games"
ON public.games
FOR SELECT
USING (public.is_game_participant(id, auth.uid()::text));

-- 4. Fix participants SELECT policy using the helper function
DROP POLICY IF EXISTS "Game participants can view participants" ON public.participants;

CREATE POLICY "Game participants can view participants"
ON public.participants
FOR SELECT
USING (
  public.is_game_participant(game_id, auth.uid()::text)
  OR
  public.is_game_admin(game_id, auth.uid())
);