import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/header";
import { useAuth } from "@/hooks/use-auth";

export default function TestNotificationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // Formulário para teste de notificação
  const [notificationForm, setNotificationForm] = useState({
    userId: user?.id || 1,
    requestId: 1,
    type: "status_update" as "status_update" | "quote_received" | "proof_uploaded",
    message: "Teste de notificação do sistema LogMene",
    sendEmail: false
  });
  
  // Funcionalidade de WhatsApp removida conforme solicitação do cliente
  
  // Formulário para teste de email
  const [emailForm, setEmailForm] = useState({
    email: user?.email || "teste@example.com"
  });
  
  const handleNotificationSubmit = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/test/notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notificationForm)
      });
      
      const data = await response.json();
      setResult(data);
      
      if (response.ok) {
        toast({
          title: "Notificação enviada",
          description: data.message,
        });
      } else {
        toast({
          title: "Erro ao enviar notificação",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao testar notificação:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao testar a notificação. Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleEmailSubmit = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch(`/api/test/send-email?email=${encodeURIComponent(emailForm.email)}`);
      const data = await response.json();
      setResult(data);
      
      if (response.ok) {
        toast({
          title: "Email enviado",
          description: data.message,
        });
      } else {
        toast({
          title: "Erro ao enviar email",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao testar email:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao testar o email. Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFallbackTest = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch(`/api/test/notification-fallback?email=${encodeURIComponent(emailForm.email)}`);
      const data = await response.json();
      setResult(data);
      
      if (response.ok) {
        toast({
          title: "Teste de fallback concluído",
          description: data.message,
        });
      } else {
        toast({
          title: "Erro no teste de fallback",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao testar fallback:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao testar o mecanismo de fallback. Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Função de envio de WhatsApp removida conforme solicitação do cliente
  
  // Função para testar envio de email via SMTP do MailerSend
  const handleSmtpTest = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch(`/api/test/smtp?email=${encodeURIComponent(emailForm.email)}`);
      const data = await response.json();
      setResult(data);
      
      if (response.ok) {
        toast({
          title: "Teste SMTP concluído",
          description: data.message,
        });
      } else {
        toast({
          title: "Erro no teste SMTP",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao testar SMTP:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao testar o envio via SMTP. Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Função para testar diretamente a API do MailerSend (implementação mais simples)
  const handleDirectTest = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch(`/api/test/mailersend?email=${encodeURIComponent(emailForm.email)}`);
      const data = await response.json();
      setResult(data);
      
      if (response.ok) {
        toast({
          title: "Teste direto concluído",
          description: data.message,
        });
      } else {
        toast({
          title: "Erro no teste direto",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao testar MailerSend diretamente:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao testar o MailerSend diretamente. Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto pb-8">
      <Header title="Ferramentas de Teste" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Teste de Notificação */}
        <Card>
          <CardHeader>
            <CardTitle>Teste de Notificação</CardTitle>
            <CardDescription>Enviar uma notificação para um usuário</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId">ID do Usuário</Label>
              <Input 
                id="userId" 
                type="number" 
                value={notificationForm.userId}
                onChange={(e) => setNotificationForm({
                  ...notificationForm,
                  userId: parseInt(e.target.value)
                })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="requestId">ID da Solicitação</Label>
              <Input 
                id="requestId" 
                type="number" 
                value={notificationForm.requestId}
                onChange={(e) => setNotificationForm({
                  ...notificationForm,
                  requestId: parseInt(e.target.value)
                })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select 
                value={notificationForm.type}
                onValueChange={(value: any) => setNotificationForm({
                  ...notificationForm,
                  type: value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status_update">Atualização de Status</SelectItem>
                  <SelectItem value="quote_received">Cotação Recebida</SelectItem>
                  <SelectItem value="proof_uploaded">Comprovante Enviado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea 
                id="message" 
                value={notificationForm.message}
                onChange={(e) => setNotificationForm({
                  ...notificationForm,
                  message: e.target.value
                })}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="sendEmail" 
                checked={notificationForm.sendEmail}
                onCheckedChange={(checked) => setNotificationForm({
                  ...notificationForm,
                  sendEmail: checked
                })}
              />
              <Label htmlFor="sendEmail">Enviar também por email</Label>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleNotificationSubmit} 
              disabled={loading}
            >
              {loading ? "Enviando..." : "Enviar Notificação"}
            </Button>
          </CardFooter>
        </Card>
        
        {/* Teste de Email */}
        <Card>
          <CardHeader>
            <CardTitle>Teste de Email</CardTitle>
            <CardDescription>Teste de envio de email via API ou SMTP usando o MailerSend</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={emailForm.email}
                onChange={(e) => setEmailForm({
                  ...emailForm,
                  email: e.target.value
                })}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap justify-between gap-2">
            <Button 
              onClick={handleEmailSubmit} 
              disabled={loading}
            >
              {loading ? "Enviando..." : "Enviar Email"}
            </Button>
            
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={handleSmtpTest} 
                disabled={loading}
                variant="secondary"
              >
                {loading ? "Testando..." : "Teste SMTP"}
              </Button>
              
              <Button 
                onClick={handleDirectTest} 
                disabled={loading}
                variant="outline"
              >
                {loading ? "Testando..." : "Teste Direto"}
              </Button>
              
              <Button 
                onClick={handleFallbackTest} 
                disabled={loading}
                variant="ghost"
                size="sm"
              >
                {loading ? "Testando..." : "Alt"}
              </Button>
            </div>
          </CardFooter>
        </Card>
        
        {/* Seção de WhatsApp removida conforme solicitação do cliente */}
      </div>
      
      {/* Exibir resultado */}
      {result && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}