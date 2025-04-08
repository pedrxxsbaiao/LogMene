-- Adicionar novos campos na tabela freight_requests
ALTER TABLE freight_requests 
  ADD COLUMN IF NOT EXISTS origin_cnpj TEXT,
  ADD COLUMN IF NOT EXISTS origin_company_name TEXT,
  ADD COLUMN IF NOT EXISTS origin_zip_code TEXT,
  ADD COLUMN IF NOT EXISTS destination_cnpj TEXT,
  ADD COLUMN IF NOT EXISTS destination_company_name TEXT,
  ADD COLUMN IF NOT EXISTS destination_zip_code TEXT,
  ADD COLUMN IF NOT EXISTS cargo_description TEXT,
  ADD COLUMN IF NOT EXISTS package_quantity INTEGER;

-- Adicionar campo volume na tabela freight_requests
ALTER TABLE freight_requests
  ADD COLUMN IF NOT EXISTS volume REAL DEFAULT 0;