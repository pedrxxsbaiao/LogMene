-- Adicionar campo volume na tabela freight_requests
ALTER TABLE freight_requests
  ADD COLUMN IF NOT EXISTS volume REAL DEFAULT 0; 