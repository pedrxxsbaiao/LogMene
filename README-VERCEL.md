# Deploy do LogMene na Vercel

Este documento contém as instruções para realizar o deploy do LogMene na plataforma Vercel.

## Passos para o Deploy

### 1. Preparação Inicial

#### Banco de Dados

Você precisa de um banco de dados PostgreSQL. Recomendamos uma das seguintes opções:

- [Neon](https://neon.tech) - PostgreSQL serverless (recomendado)
- [Supabase](https://supabase.com) - PostgreSQL com painel de administração
- [Railway](https://railway.app) - PostgreSQL gerenciado

Ao criar o banco, guarde a URL de conexão que será usada como variável de ambiente `DATABASE_URL`.

### 2. Configurando o Projeto na Vercel

1. Faça login na [Vercel](https://vercel.com)
2. Clique em "Add New..." e selecione "Project"
3. Importe seu repositório GitHub/GitLab/Bitbucket
4. Na configuração do projeto:
   - **Framework Preset**: Selecione "Other"
   - **Build Command**: npm run build
   - **Output Directory**: dist
   - **Install Command**: npm install

### 3. Configuração de Variáveis de Ambiente

Configure as seguintes variáveis de ambiente na interface da Vercel:

#### Obrigatórias:
- `DATABASE_URL` - URL de conexão do banco PostgreSQL
- `NODE_ENV` - Defina como "production"
- `JWT_SECRET` - String aleatória para assinar tokens JWT

#### APIs Externas (se estiver usando):
- `GOOGLE_MAPS_API_KEY` - Chave da API do Google Maps
- `GOOGLE_CLIENT_ID` - Client ID para autenticação OAuth2 do Google
- `GOOGLE_CLIENT_SECRET` - Client Secret para OAuth2 do Google
- `GOOGLE_REFRESH_TOKEN` - Token de atualização para OAuth2 do Google
- `VITE_GOOGLE_MAPS_API_KEY` - Chave da API do Google Maps (para o front-end)

#### Serviços de Email:
- `MAILERSEND_API_KEY` - Chave da API do MailerSend (se estiver usando)

#### SMS e WhatsApp:
- `TWILIO_ACCOUNT_SID` - SID da conta do Twilio
- `TWILIO_AUTH_TOKEN` - Token de autenticação do Twilio
- `TWILIO_PHONE_NUMBER` - Número de telefone do Twilio
- `TWILIO_WHATSAPP_NUMBER` - Número do WhatsApp do Twilio
- `WHATSAPP_SIMULATION_MODE` - true/false para simular envios de WhatsApp
- `SMS_SIMULATION_MODE` - true/false para simular envios de SMS
- `SMS_BYPASS_VERIFICATION` - true/false para ignorar verificação de SMS

### 4. Deploy do Banco de Dados

Após configurar as variáveis de ambiente, você precisa executar as migrações do banco de dados. 

Na Vercel, você pode fazer isso via:

1. Vá até "Settings" > "Functions" > "Console" no seu projeto
2. Execute o comando: `npx drizzle-kit push`

Alternativamente, você pode executar isso localmente usando:

```bash
# Certifique-se de ter a variável DATABASE_URL configurada
npx drizzle-kit push
```

### 5. Verificação e Solução de Problemas

Após o deploy, você pode verificar o status do ambiente usando o endpoint especial:

```
https://seu-projeto.vercel.app/api/check-env
```

Este endpoint fornecerá informações sobre:
- Status geral do ambiente
- Configuração do banco de dados
- Variáveis de ambiente críticas que estão faltando
- Serviços opcionais que estão configurados

#### Verificação de problemas comuns:

1. **Erro de CORS**: Verifique se os domínios da sua aplicação estão configurados corretamente nas políticas de CORS.
   - O domínio gerado pela Vercel é adicionado automaticamente à lista de origens permitidas.
   - Se estiver usando um domínio personalizado, adicione-o à variável `APP_DOMAIN`.

2. **Erro de Banco de Dados**: 
   - Verifique se a variável `DATABASE_URL` está correta
   - Certifique-se de que as tabelas foram criadas usando `npx drizzle-kit push`
   - Se estiver usando o Neon, confirme que sua conexão está configurada para serverless

3. **Problemas de Autenticação**: 
   - Verifique se o `JWT_SECRET` está configurado
   - O sistema usa JWT para autenticação na Vercel, o que é diferente do sistema de sessão no desenvolvimento local

4. **Integrações de API**: 
   - Verifique se todas as chaves de API estão corretamente configuradas
   - Acesse `/api/check-keys` para verificar quais APIs externas estão configuradas

### 6. Domínio Personalizado (Opcional)

Para configurar um domínio personalizado:

1. Na Vercel, vá para "Settings" > "Domains"
2. Adicione seu domínio e siga as instruções para configurar os registros DNS
3. A Vercel fornecerá automaticamente certificados SSL/TLS

## Manutenção e Atualizações

- Para atualizar sua aplicação, simplesmente faça push para o repositório conectado
- A Vercel detectará as alterações e fará o novo deploy automaticamente
- Para atualizações de esquema do banco de dados, pode ser necessário executar `npx drizzle-kit push` novamente

## Recursos Adicionais

- [Documentação da Vercel](https://vercel.com/docs)
- [Documentação do Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [Documentação do Neon PostgreSQL](https://neon.tech/docs)