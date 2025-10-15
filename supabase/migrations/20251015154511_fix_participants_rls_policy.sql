-- Fix participants RLS policy to allow participants to view all participants in games they are part of

-- 1. Create a secure function to check if user is a participant in a game
CREATE OR REPLACE FUNCTION public.is_game_participant(p_game_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.participants
    WHERE participants.game_id = p_game_id
    AND participants.user_id = auth.uid()::text
  );
END;
$$;

-- 2. Update the participants SELECT policy to use the secure function
DROP POLICY IF EXISTS "Game participants can view participants" ON public.participants;

CREATE POLICY "Game participants can view participants"
ON public.participants
FOR SELECT
USING (
  is_game_participant(game_id)
  OR
  EXISTS (
    SELECT 1 FROM public.games
    WHERE games.id = participants.game_id
    AND games.admin_id = auth.uid()
  )
);