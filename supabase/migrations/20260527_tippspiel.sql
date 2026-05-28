-- Participants in the prediction game
CREATE TABLE tipp_teilnehmer (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Matchdays
CREATE TABLE tipp_spieltage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  spieltag int NOT NULL,
  saison text NOT NULL DEFAULT '2025',
  deadline timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(spieltag, saison)
);

-- Individual matches within a matchday
CREATE TABLE tipp_spiele (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  spieltag_id uuid REFERENCES tipp_spieltage(id) ON DELETE CASCADE NOT NULL,
  openligadb_id int UNIQUE,
  heim_team text NOT NULL,
  gast_team text NOT NULL,
  kickoff timestamptz,
  heim_tore_result int,
  gast_tore_result int,
  created_at timestamptz DEFAULT now()
);

-- Individual predictions
CREATE TABLE tipps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  spiel_id uuid REFERENCES tipp_spiele(id) ON DELETE CASCADE NOT NULL,
  teilnehmer_id uuid REFERENCES tipp_teilnehmer(id) ON DELETE CASCADE NOT NULL,
  heim_tore int NOT NULL,
  gast_tore int NOT NULL,
  punkte int,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(spiel_id, teilnehmer_id)
);
