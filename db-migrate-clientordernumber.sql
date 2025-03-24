-- Adicionar a coluna client_order_number à tabela freight_requests se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'freight_requests' 
        AND column_name = 'client_order_number'
    ) THEN
        ALTER TABLE freight_requests ADD COLUMN client_order_number INTEGER;
    END IF;
END $$;