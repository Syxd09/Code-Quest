-- Create a secure function to find games by join code (without exposing admin_id or other sensitive data)
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