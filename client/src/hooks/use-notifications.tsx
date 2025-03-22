import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { Notification } from '@shared/schema';

export function useNotifications() {
  const { user } = useAuth();
  
  // Buscar notificações
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch
  } = useQuery<Notification[]>({
    queryKey: ['/api/user-services'],
    queryFn: ({ queryKey }) => 
      fetch(`${queryKey[0]}?op=notifications&subOp=list`)
        .then(res => res.ok ? res.json() : []),
    enabled: !!user,
  });
  
  // Buscar contagem de notificações não lidas
  const { 
    data: unreadCountData = { count: 0 },
    refetch: refetchCount
  } = useQuery<{ count: number }>({
    queryKey: ['/api/user-services'],
    queryFn: ({ queryKey }) => 
      fetch(`${queryKey[0]}?op=notifications&subOp=unread-count`)
        .then(res => res.ok ? res.json() : { count: 0 }),
    enabled: !!user,
    select: (data) => data,
  });
  
  // Marcar notificação como lida
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/user-services?op=notifications&subOp=read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: notificationId }),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao marcar notificação como lida');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Atualizar cache de notificações e contagem
      queryClient.invalidateQueries({ queryKey: ['/api/user-services'] });
    },
  });
  
  // Marcar todas as notificações como lidas
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/user-services?op=notifications&subOp=read-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao marcar todas as notificações como lidas');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Atualizar cache de notificações
      queryClient.invalidateQueries({ queryKey: ['/api/user-services'] });
    },
  });
  
  return { 
    notifications,
    unreadCount: unreadCountData.count,
    isLoading,
    error,
    refetch,
    refetchCount,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}