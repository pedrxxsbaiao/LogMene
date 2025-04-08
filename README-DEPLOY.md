# Guia de Deploy

## Configuração do Ambiente

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Configurações do Banco de Dados
DATABASE_URL=postgres://usuario:senha@localhost:5432/nome_do_banco

# Configurações do Servidor
PORT=3000
NODE_ENV=production

# Configurações de Segurança
JWT_SECRET=sua_chave_secreta_jwt
```

### Instalação de Dependências

```bash
npm install
```

### Compilação do Projeto

```bash
npm run build
```

### Inicialização do Servidor

```bash
npm start
```

## Verificação de Funcionamento

Após o deploy, verifique se:

1. O servidor está respondendo na porta configurada
2. As rotas da API estão acessíveis
3. O banco de dados está conectado e respondendo

## Solução de Problemas

Se encontrar problemas:

1. Verifique os logs do servidor
2. Confirme se todas as variáveis de ambiente estão configuradas corretamente
3. Verifique a conexão com o banco de dados

## Documentação Adicional

- [Documentação do Express](https://expressjs.com/)
- [Documentação do Sequelize](https://sequelize.org/)
- [Documentação do PostgreSQL](https://www.postgresql.org/docs/)