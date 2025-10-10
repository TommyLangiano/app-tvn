-- Add CAP field to commesse table
ALTER TABLE commesse
ADD COLUMN cap TEXT;

-- Create index for CAP for faster searches
CREATE INDEX idx_commesse_cap ON commesse(cap) WHERE cap IS NOT NULL;
