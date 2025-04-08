import express, { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import fsPromises from 'fs/promises';
import compression from 'compression';
import helmet from 'helmet';

// Carrega variáveis de ambiente do arquivo .env se existir
try {
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    log('Carregando variáveis de ambiente do arquivo .env', 'env-loader');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([^#][^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim().replace(/^['"](.*)['"]$/, '$1'); // Remove aspas se existirem
        
        // Verifica se o valor referencia outra variável de ambiente
        if (value.startsWith('${') && value.endsWith('}')) {
          const envVarName = value.substring(2, value.length - 1);
          value = process.env[envVarName] || '';
          log(`Substituição de variável ${key}=${envVarName}`, 'env-loader');
        }
        
        process.env[key] = value;
        log(`Variável ${key} carregada com sucesso`, 'env-loader');
      }
    });
  }
} catch (error) {
  log(`Erro ao carregar arquivo .env: ${error}`, 'env-loader');
}

const app = express();

// Configurações de segurança e performance
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
}));

// Compressão GZIP
app.use(compression());

// Limites de requisição
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Cache de headers
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

async function runVolumeMigration() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL não está definida');
    }

    const sql = neon(process.env.DATABASE_URL);

    const migrationSQL = `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'freight_requests' 
        AND column_name = 'volume'
      ) THEN
        ALTER TABLE freight_requests
        ADD COLUMN volume DECIMAL(10,2) DEFAULT 0.00;

        UPDATE freight_requests
        SET volume = 0.00
        WHERE volume IS NULL;

        ALTER TABLE freight_requests
        ALTER COLUMN volume SET NOT NULL;
      END IF;
    END $$;
    `;

    await sql(migrationSQL);
    console.log('Verificação/migração da coluna volume concluída com sucesso');
  } catch (error) {
    console.error('Erro ao verificar/migrar coluna volume:', error);
  }
}

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    try {
      await runVolumeMigration();
      log(`serving on port ${port}`);
    } catch (error) {
      log(`Erro ao iniciar servidor: ${error}`, 'server');
    }
  });
})();
