-- Remove a coluna volume da tabela freight_requests
ALTER TABLE freight_requests
DROP COLUMN IF EXISTS volume; 