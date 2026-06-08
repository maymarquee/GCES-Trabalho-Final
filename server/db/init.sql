CREATE TABLE IF NOT EXISTS matches (
  id         SERIAL       PRIMARY KEY,
  game_name  VARCHAR(100) NOT NULL,
  player1_id VARCHAR(100) NOT NULL,
  player2_id VARCHAR(100) NOT NULL,
  winner     SMALLINT     CHECK (winner IN (1, 2)),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
