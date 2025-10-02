-- Create enum for game status
CREATE TYPE game_status AS ENUM ('waiting', 'started', 'paused', 'ended');

-- Create enum for question types
CREATE TYPE question_type AS ENUM ('mcq', 'checkbox', 'short', 'jumble');

-- Create enum for user status
CREATE TYPE user_status AS ENUM ('active', 'eliminated', 'disconnected');

-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  join_code TEXT NOT NULL UNIQUE,
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status game_status DEFAULT 'waiting',
  current_question_id UUID,
  settings JSONB DEFAULT '{
    "cheat_strikes": 3,
    "cheat_penalty": -50,
    "reveal_duration": 10
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Questions table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  type question_type NOT NULL,
  text TEXT NOT NULL,
  options TEXT[],
  correct_answers TEXT[],
  keywords JSONB DEFAULT '[]'::jsonb,
  points INTEGER DEFAULT 100,
  time_limit INTEGER DEFAULT 30,
  hint TEXT,
  hint_penalty INTEGER DEFAULT 10,
  order_index INTEGER NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Participants table
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  score INTEGER DEFAULT 0,
  status user_status DEFAULT 'active',
  cheat_count INTEGER DEFAULT 0,
  fingerprint TEXT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(game_id, user_id)
);

-- Responses table
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE NOT NULL,
  answer JSONB NOT NULL,
  correct BOOLEAN NOT NULL,
  time_taken INTEGER NOT NULL,
  points_awarded INTEGER NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(question_id, participant_id, idempotency_key)
);

-- Cheat logs table
CREATE TABLE cheat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE NOT NULL,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cheat_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for games
CREATE POLICY "Anyone can view games" ON games FOR SELECT USING (true);
CREATE POLICY "Admins can create games" ON games FOR INSERT WITH CHECK (auth.uid() = admin_id);
CREATE POLICY "Admins can update their games" ON games FOR UPDATE USING (auth.uid() = admin_id);

-- RLS Policies for questions
CREATE POLICY "Anyone can view questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Game admins can manage questions" ON questions 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM games WHERE games.id = questions.game_id AND games.admin_id = auth.uid()
    )
  );

-- RLS Policies for participants
CREATE POLICY "Anyone can view participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Anyone can join as participant" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Participants can update themselves" ON participants FOR UPDATE 
  USING (true);

-- RLS Policies for responses
CREATE POLICY "Anyone can view responses" ON responses FOR SELECT USING (true);
CREATE POLICY "Anyone can submit responses" ON responses FOR INSERT WITH CHECK (true);

-- RLS Policies for cheat logs
CREATE POLICY "Anyone can view cheat logs" ON cheat_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can create cheat logs" ON cheat_logs FOR INSERT WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE questions;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE responses;
ALTER PUBLICATION supabase_realtime ADD TABLE cheat_logs;

-- Indexes for performance
CREATE INDEX idx_questions_game_id ON questions(game_id);
CREATE INDEX idx_participants_game_id ON participants(game_id);
CREATE INDEX idx_responses_game_id ON responses(game_id);
CREATE INDEX idx_responses_question_id ON responses(question_id);
CREATE INDEX idx_cheat_logs_game_id ON cheat_logs(game_id);
CREATE INDEX idx_games_join_code ON games(join_code);

-- Function to generate unique join codes
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate join codes
CREATE OR REPLACE FUNCTION set_join_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.join_code IS NULL OR NEW.join_code = '' THEN
    NEW.join_code := generate_join_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER games_join_code_trigger
BEFORE INSERT ON games
FOR EACH ROW
EXECUTE FUNCTION set_join_code();