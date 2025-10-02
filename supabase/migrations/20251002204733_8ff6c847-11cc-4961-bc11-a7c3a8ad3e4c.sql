-- Fix games table security: restrict access and create secure join lookup

-- 1. Create a secure function to find games by join code (without exposing admin_id)
CREATE OR REPLACE FUNCTION public.find_game_by_join_code(p_join_code text)
RETURNS TABLE(
  id uuid,
  title text,
  status game_status,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.title,
    g.status,
    g.created_at
  FROM games g
  WHERE g.join_code = UPPER(p_join_code);
END;
$$;

-- 2. Update games table RLS policy to restrict access
DROP POLICY IF EXISTS "Anyone can view games" ON public.games;

-- Allow admins to see their own games
CREATE POLICY "Admins can view own games"
ON public.games
FOR SELECT
USING (auth.uid() = admin_id);

-- Allow participants to see games they're in
CREATE POLICY "Participants can view their games"
ON public.games
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.participants
    WHERE participants.game_id = games.id
    AND participants.user_id = auth.uid()::text
  )
);

-- Note: Join flow now uses find_game_by_join_code() function instead of direct SELECT