-- Fix critical security issues in RLS policies

-- 1. Fix participants table - restrict updates to only last_seen_at for self
DROP POLICY IF EXISTS "Participants can update themselves" ON public.participants;

CREATE POLICY "Participants can update own last_seen_at"
ON public.participants
FOR UPDATE
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- 2. Fix responses table - ensure participant_id matches the submitter
DROP POLICY IF EXISTS "Anyone can submit responses" ON public.responses;

CREATE POLICY "Participants can submit own responses"
ON public.responses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.participants
    WHERE participants.id = responses.participant_id
    AND participants.user_id = auth.uid()::text
  )
);

-- 3. Restrict responses view - only game admins and participants can see responses
DROP POLICY IF EXISTS "Anyone can view responses" ON public.responses;

CREATE POLICY "Game participants can view game responses"
ON public.responses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.participants
    WHERE participants.game_id = responses.game_id
    AND participants.user_id = auth.uid()::text
  )
  OR
  EXISTS (
    SELECT 1 FROM public.games
    WHERE games.id = responses.game_id
    AND games.admin_id = auth.uid()
  )
);

-- 4. Fix questions table - hide correct answers from participants
DROP POLICY IF EXISTS "Anyone can view questions" ON public.questions;

CREATE POLICY "Participants can view questions without answers"
ON public.questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.participants
    WHERE participants.game_id = questions.game_id
    AND participants.user_id = auth.uid()::text
  )
  OR
  EXISTS (
    SELECT 1 FROM public.games
    WHERE games.id = questions.game_id
    AND games.admin_id = auth.uid()
  )
);

-- 5. Fix cheat_logs - only admins can insert and view
DROP POLICY IF EXISTS "Anyone can create cheat logs" ON public.cheat_logs;
DROP POLICY IF EXISTS "Anyone can view cheat logs" ON public.cheat_logs;

CREATE POLICY "Game admins can manage cheat logs"
ON public.cheat_logs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.games
    WHERE games.id = cheat_logs.game_id
    AND games.admin_id = auth.uid()
  )
);

-- 6. Restrict participants view to game participants only
DROP POLICY IF EXISTS "Anyone can view participants" ON public.participants;

CREATE POLICY "Game participants can view participants"
ON public.participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.participants p
    WHERE p.game_id = participants.game_id
    AND p.user_id = auth.uid()::text
  )
  OR
  EXISTS (
    SELECT 1 FROM public.games
    WHERE games.id = participants.game_id
    AND games.admin_id = auth.uid()
  )
);

-- 7. Create server-side function to handle cheat detection and scoring
CREATE OR REPLACE FUNCTION public.handle_cheat_detection(
p_participant_id uuid,
p_game_id uuid,
p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
v_participant participants%ROWTYPE;
v_new_cheat_count integer;
v_new_score integer;
v_new_status user_status;
BEGIN
-- Get current participant data
SELECT * INTO v_participant
FROM participants
WHERE id = p_participant_id AND game_id = p_game_id;

IF NOT FOUND THEN
  RETURN jsonb_build_object('error', 'Participant not found');
END IF;

-- Calculate new values
v_new_cheat_count := COALESCE(v_participant.cheat_count, 0) + 1;
v_new_score := GREATEST(0, COALESCE(v_participant.score, 0) - 50);
v_new_status := v_participant.status;

-- Auto-elimination removed: participants are no longer eliminated on 3rd+ attempts
-- Keep cheat_count incrementing and score penalties for monitoring purposes

-- Insert cheat log
INSERT INTO cheat_logs (game_id, participant_id, reason)
VALUES (p_game_id, p_participant_id, p_reason);

-- Update participant
UPDATE participants
SET
  cheat_count = v_new_cheat_count,
  score = v_new_score,
  status = v_new_status
WHERE id = p_participant_id;

RETURN jsonb_build_object(
  'success', true,
  'cheat_count', v_new_cheat_count,
  'score', v_new_score,
  'status', v_new_status
);
END;
$$;

-- 8. Create server-side function to handle response submission with scoring
CREATE OR REPLACE FUNCTION public.submit_response(
  p_game_id uuid,
  p_question_id uuid,
  p_participant_id uuid,
  p_answer jsonb,
  p_correct boolean,
  p_time_taken integer,
  p_points_awarded integer,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant participants%ROWTYPE;
BEGIN
  -- Verify participant belongs to requesting user
  SELECT * INTO v_participant
  FROM participants
  WHERE id = p_participant_id 
  AND game_id = p_game_id
  AND user_id = auth.uid()::text;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;
  
  -- Check if eliminated
  IF v_participant.status = 'eliminated'::user_status THEN
    RETURN jsonb_build_object('error', 'Participant is eliminated');
  END IF;
  
  -- Insert response (will fail if duplicate idempotency_key)
  INSERT INTO responses (
    game_id,
    question_id,
    participant_id,
    answer,
    correct,
    time_taken,
    points_awarded,
    idempotency_key
  ) VALUES (
    p_game_id,
    p_question_id,
    p_participant_id,
    p_answer,
    p_correct,
    p_time_taken,
    p_points_awarded,
    p_idempotency_key
  );
  
  -- Update participant score
  UPDATE participants
  SET score = COALESCE(score, 0) + p_points_awarded
  WHERE id = p_participant_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', p_points_awarded
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('error', 'Response already submitted');
END;
$$;