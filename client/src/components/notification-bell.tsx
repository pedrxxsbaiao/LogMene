import { BellRing, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/use-notifications";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    isLoading 
  } = useNotifications();
  const [, navigate] = useLocation();
  
  // Ao abrir o menu, marcar todas as notificações como lidas
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && unreadCount > 0) {
      // Marcar todas as notificações como lidas
      markAllAsRead();
    }
  };
  
  // Ordenar notificações: não lidas primeiro, depois por data
  const sortedNotifications = [...notifications].sort((a, b) => {
    if (a.read === b.read) {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    return a.read ? 1 : -1;
  });

  function handleNotificationClick(notificationId: number, requestId: number | null) {
    // Marcar como lida
    markAsRead(notificationId);
    
    // Fechar o dropdown
    setOpen(false);
    
    // Navegar para a página de detalhes da solicitação, se houver
    if (requestId) {
      navigate(`/requests/${requestId}`);
    }
  }
  
  function formatDate(date: Date | null) {
    if (!date) return '';
    
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 60) {
      return `${minutes} min atrás`;
    } else if (hours < 24) {
      return `${hours}h atrás`;
    } else if (days < 7) {
      return `${days}d atrás`;
    } else {
      return new Date(date).toLocaleDateString('pt-BR');
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-white hover:bg-primary-light">
          <BellRing className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 flex items-center justify-center h-5 min-w-[1.25rem] text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80" align="end">
        <div className="flex justify-between items-center px-4 py-2 border-b">
          <h4 className="font-medium">Notificações</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={() => markAllAsRead()}
            >
              <Check className="h-3 w-3 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex justify-center items-center h-20">
              <p className="text-sm text-muted-foreground">Carregando notificações...</p>
            </div>
          ) : sortedNotifications.length === 0 ? (
            <div className="flex justify-center items-center h-20">
              <p className="text-sm text-muted-foreground">Não há notificações</p>
            </div>
          ) : (
            <div className="py-1">
              {sortedNotifications.map((notification) => (
                <DropdownMenuItem 
                  key={notification.id}
                  className={`px-4 py-3 cursor-pointer ${notification.read ? 'opacity-70' : 'border-l-2 border-primary bg-primary/5'}`}
                  onClick={() => handleNotificationClick(notification.id, notification.requestId)}
                >
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex justify-between items-start">
                      <p className={`text-sm ${notification.read ? 'font-normal' : 'font-medium'}`}>
                        {notification.message}
                      </p>
                      <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                        {formatDate(notification.createdAt)}
                      </span>
                    </div>
                    {notification.requestId && (
                      <p className="text-xs text-muted-foreground">
                        Solicitação #{notification.requestId}
                      </p>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}