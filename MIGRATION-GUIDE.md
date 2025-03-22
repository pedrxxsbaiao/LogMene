# Guia de Migração do Banco de Dados

Este documento fornece instruções sobre como migrar seu banco de dados atual para um provedor serverless como o Neon, que é ideal para uso com a Vercel.

## 1. Configurando um Banco de Dados no Neon

### Criando sua conta e banco

1. Acesse [Neon](https://neon.tech) e crie uma conta gratuita
2. Crie um novo projeto e banco de dados PostgreSQL
3. Após a criação, você receberá uma string de conexão semelhante a:
   ```
   postgres://user:password@endpoint.neon.tech/neondb
   ```
4. Guarde esta string, você a usará como `DATABASE_URL`

## 2. Exportando Dados do Banco Atual

É possível exportar os dados do seu banco atual para importar no Neon. Existem duas abordagens:

### Opção 1: Usando pg_dump (recomendado)

Se você tem acesso ao banco PostgreSQL atual via linha de comando:

```bash
# Substituir pelos detalhes corretos do seu banco atual
pg_dump -h localhost -U seu_usuario -d seu_banco -F c > backup.dump
```

### Opção 2: Script SQL via Drizzle

Você pode gerar automaticamente as consultas SQL necessárias:

```bash
# Instalar a ferramenta globalmente, se ainda não tiver
npm install -g drizzle-kit

# Gerar o SQL para toda a estrutura do banco
npx drizzle-kit generate:pg --schema=./shared/schema.ts --out=./migrations
```

## 3. Importando os Dados no Neon

### Importando com pg_restore (para arquivos .dump)

```bash
# Substitua pela URL do seu banco Neon
pg_restore -d "postgres://user:password@endpoint.neon.tech/neondb" -c backup.dump
```

### Executando scripts SQL

Para os scripts SQL gerados pelo Drizzle:

1. Acesse o SQL Editor no painel de controle do Neon
2. Cole e execute os scripts gerados na etapa anterior

## 4. Criando o Esquema com Drizzle Push

A maneira mais simples, especialmente se você não precisa preservar os dados:

```bash
# Configure a variável de ambiente ou substitua no comando
export DATABASE_URL="postgres://user:password@endpoint.neon.tech/neondb"

# Execute o comando para criar todas as tabelas
npx drizzle-kit push
```

## 5. Script de Dump Simplificado

Se preferir, você pode usar este script SQL para fazer um dump apenas dos dados, sem a estrutura:

```sql
-- Usuários
COPY (SELECT * FROM users) TO '/tmp/users.csv' WITH CSV HEADER;

-- Solicitações de Frete
COPY (SELECT * FROM freight_requests) TO '/tmp/freight_requests.csv' WITH CSV HEADER;

-- Cotações
COPY (SELECT * FROM quotes) TO '/tmp/quotes.csv' WITH CSV HEADER;

-- Comprovantes de Entrega
COPY (SELECT * FROM delivery_proofs) TO '/tmp/delivery_proofs.csv' WITH CSV HEADER;

-- Notificações
COPY (SELECT * FROM notifications) TO '/tmp/notifications.csv' WITH CSV HEADER;
```

E depois importar no Neon:

```sql
-- Importar Usuários
COPY users FROM '/tmp/users.csv' CSV HEADER;

-- Importar Solicitações de Frete
COPY freight_requests FROM '/tmp/freight_requests.csv' CSV HEADER;

-- E assim por diante para as outras tabelas...
```

## 6. Verificando a Migração

Após concluir a migração, verifique:

1. Todas as tabelas foram criadas corretamente
2. Os dados foram importados corretamente (se aplicável)
3. As sequências de ID estão configuradas corretamente para continuarem a partir do último ID usado

## 7. Atualizando a Aplicação

Finalmente, atualize a variável de ambiente `DATABASE_URL` no seu projeto Vercel para apontar para o novo banco de dados Neon.

## 8. Adaptando para Ambiente Serverless

Para garantir que sua aplicação funcione corretamente no ambiente serverless da Vercel com o Neon:

1. **Configure a Conexão Pooling**: O Neon oferece suporte para conexão serverless, ideal para ambientes Vercel:
   ```js
   // Em server/db.ts ou api/db.js conforme apropriado
   import { neon } from '@neondatabase/serverless';
   
   const sql = neon(process.env.DATABASE_URL);
   ```

2. **Otimize para Conexões de Curta Duração**: As funções serverless criam e destroem conexões com frequência:
   - Minimize o número de consultas por requisição
   - Evite transações longas
   - Considere usar funções em lote quando possível

3. **Atualize o Esquema Gradualmente**: Se você precisa fazer alterações no esquema após a migração:
   ```bash
   npx drizzle-kit generate:pg --schema=./shared/schema.ts --out=./migrations
   ```
   Revise os arquivos gerados antes de aplicar as alterações.

## Solução de Problemas

- **Erro de Conexão**: Verifique se o IP da Vercel está na lista de permissões do Neon.
  - O Neon geralmente permite conexões de qualquer IP por padrão.
  - Se houver restrições, você pode encontrar o [IP da Vercel na documentação](https://vercel.com/docs/functions/serverless-functions/runtimes#serverless-function-regions).

- **Erro de Versão**: Certifique-se de que o Neon suporta a versão PostgreSQL que você está usando.
  - O Neon geralmente usa PostgreSQL 15, verifique compatibilidade com sua aplicação.

- **Erros de Sequência**: Você pode precisar reajustar manualmente as sequências após a importação.
  ```sql
  -- Exemplo para reajustar a sequência da tabela users
  SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
  ```

- **Timeouts de Conexão**: Se ocorrerem timeouts, verifique:
  - A configuração de timeout no Neon (padrão é 30 segundos)
  - O tempo máximo de execução das funções serverless na Vercel
  - Implementação de lógica de retry para operações críticas