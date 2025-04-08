-- Adiciona a coluna volume à tabela freight_requests
ALTER TABLE freight_requests
ADD COLUMN IF NOT EXISTS volume real DEFAULT 0; 