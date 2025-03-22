import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { AlertCircle, CheckCircle, Database, Key, Server } from "lucide-react";

// Interfaces para tipagem
interface EnvStatus {
  status: string;
  environment?: {
    nodeEnv: string;
    isProduction: boolean;
    isVercel: boolean;
    vercelEnv?: string;
    timestamp: string;
  };
  database?: {
    isConfigured: boolean;
    type?: string;
    host?: string;
  };
  auth?: {
    jwtConfigured: boolean;
  };
  missingCriticalKeys?: string[];
  configuredOptionalServices?: string[];
  requestInfo?: {
    ip: string;
    userAgent: string;
    host: string;
  };
}

interface ApiKeyStatus {
  keyStatus: {
    [key: string]: {
      configured: boolean;
      masked: string | null;
    };
  };
}

export default function SystemStatusPage() {
  // Usar a API consolidada em system-utils.js
  const { data: envStatus, isLoading: isLoadingEnv } = useQuery<EnvStatus>({
    queryKey: ["/api/system-utils", "check-env"],
    queryFn: async () => {
      const response = await fetch(`/api/system-utils?op=check-env`);
      if (!response.ok) throw new Error('Falha ao verificar o ambiente');
      return response.json();
    },
    staleTime: 30 * 1000, // 30 segundos
  });

  const { data: apiKeysStatus, isLoading: isLoadingKeys } = useQuery<ApiKeyStatus>({
    queryKey: ["/api/system-utils", "check-keys"],
    queryFn: async () => {
      const response = await fetch(`/api/system-utils?op=check-keys`);
      if (!response.ok) throw new Error('Falha ao verificar as chaves');
      return response.json();
    },
    staleTime: 30 * 1000, // 30 segundos
  });
  
  // Valores de fallback para garantir segurança com tipagem
  const safeEnvStatus: EnvStatus = envStatus || {
    status: "unknown",
    environment: { nodeEnv: "unknown", isProduction: false, isVercel: false, timestamp: "" },
    database: { isConfigured: false },
    missingCriticalKeys: []
  };
  
  const safeApiKeyStatus: ApiKeyStatus = apiKeysStatus || {
    keyStatus: {}
  };

  return (
    <div className="container pb-16">
      <Header title="Status do Sistema" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Server className="mr-2 h-5 w-5" />
              Ambiente
            </CardTitle>
            <CardDescription>
              Informações sobre o ambiente de execução
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingEnv ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            ) : envStatus ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  {envStatus.status === "ok" ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="mr-1 h-3 w-3" /> Operacional
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      <AlertCircle className="mr-1 h-3 w-3" /> Problemas detectados
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="font-medium">Ambiente:</span>{" "}
                    {envStatus.environment?.nodeEnv || "não definido"}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Modo de Produção:</span>{" "}
                    {envStatus.environment?.isProduction ? "Sim" : "Não"}
                  </div>
                  {envStatus.environment?.isVercel && (
                    <div className="text-sm">
                      <span className="font-medium">Vercel:</span>{" "}
                      {envStatus.environment.vercelEnv}
                    </div>
                  )}
                </div>
                
                {envStatus.missingCriticalKeys && envStatus.missingCriticalKeys.length > 0 && (
                  <div className="mt-3">
                    <span className="text-sm font-medium text-red-600">
                      Variáveis de ambiente críticas faltando:
                    </span>
                    <ul className="mt-1 text-xs text-red-600 list-disc list-inside">
                      {envStatus.missingCriticalKeys.map((key: string) => (
                        <li key={key}>{key}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="text-xs text-gray-500 mt-2">
                  Última verificação: {envStatus.environment?.timestamp ? new Date(envStatus.environment.timestamp).toLocaleString() : '-'}
                </div>
              </div>
            ) : (
              <div className="text-sm text-amber-600">
                Não foi possível verificar o status do ambiente.
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              Banco de Dados
            </CardTitle>
            <CardDescription>
              Status da conexão com o banco de dados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingEnv ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            ) : envStatus ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  {envStatus.database?.isConfigured ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="mr-1 h-3 w-3" /> Configurado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      <AlertCircle className="mr-1 h-3 w-3" /> Não configurado
                    </Badge>
                  )}
                </div>
                
                {envStatus.database?.isConfigured && (
                  <div className="space-y-1">
                    <div className="text-sm">
                      <span className="font-medium">Tipo:</span>{" "}
                      {envStatus.database.type}
                    </div>
                    {envStatus.database.host && (
                      <div className="text-sm">
                        <span className="font-medium">Host:</span>{" "}
                        {envStatus.database.host}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-amber-600">
                Não foi possível verificar o status do banco de dados.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="mr-2 h-5 w-5" />
            Chaves de API
          </CardTitle>
          <CardDescription>
            Status das integrações com serviços externos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingKeys ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : apiKeysStatus ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Google Maps & Email</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs">API de Mapas:</span>
                      {apiKeysStatus.keyStatus.GOOGLE_MAPS_API_KEY?.configured ? (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          Configurado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                          Não configurado
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Gmail OAuth:</span>
                      {apiKeysStatus.keyStatus.GOOGLE_CLIENT_ID?.configured && 
                       apiKeysStatus.keyStatus.GOOGLE_CLIENT_SECRET?.configured && 
                       apiKeysStatus.keyStatus.GOOGLE_REFRESH_TOKEN?.configured ? (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          Configurado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                          Não configurado
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Twilio (SMS & WhatsApp)</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Credenciais Twilio:</span>
                      {apiKeysStatus.keyStatus.TWILIO_ACCOUNT_SID?.configured && 
                       apiKeysStatus.keyStatus.TWILIO_AUTH_TOKEN?.configured ? (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          Configurado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                          Não configurado
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Número de Telefone:</span>
                      {apiKeysStatus.keyStatus.TWILIO_PHONE_NUMBER?.configured ? (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          Configurado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                          Não configurado
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="text-xs text-gray-500">
                <p>Nota: Em produção, o sistema precisará das seguintes chaves para funcionar corretamente:</p>
                <ul className="list-disc list-inside mt-1">
                  <li>Google Maps API Key: Para visualização de mapas e cálculo de distâncias</li>
                  <li>Gmail OAuth: Para envio de emails de notificação</li>
                  <li>Twilio: Para envio de SMS e mensagens de WhatsApp</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-sm text-amber-600">
              Não foi possível verificar o status das chaves de API.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}