-- Add CIG and CUP fields to commesse table
ALTER TABLE commesse
ADD COLUMN cig TEXT,
ADD COLUMN cup TEXT;

-- Create index for CIG and CUP for faster searches
CREATE INDEX idx_commesse_cig ON commesse(cig) WHERE cig IS NOT NULL;
CREATE INDEX idx_commesse_cup ON commesse(cup) WHERE cup IS NOT NULL;
