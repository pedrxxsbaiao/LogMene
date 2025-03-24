import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user-services"],
    queryFn: async () => {
      try {
        // Primeiro tenta o endpoint original
        console.log("Tentando obter usuário atual no endpoint original...");
        const res = await fetch("/api/user", { 
          credentials: "include",
          headers: { "Content-Type": "application/json" }
        });
        if (!res.ok) throw new Error('Não autenticado no endpoint original');
        return await res.json();
      } catch (err) {
        console.log("Fallback para o endpoint consolidado...");
        // Fallback para o endpoint consolidado
        const fn = getQueryFn({ on401: "returnNull", customQuery: "?op=auth&subOp=current" });
        return fn();
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        // Primeiro tenta o endpoint original
        console.log("Tentando login no endpoint original...");
        const res = await apiRequest("POST", "/api/login", credentials);
        return await res.json();
      } catch (err) {
        console.log("Fallback para o endpoint consolidado...");
        // Fallback para o endpoint consolidado
        const res = await apiRequest("POST", "/api/user-services?op=auth&subOp=login", credentials);
        return await res.json();
      }
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user-services"], user);
      const welcomeMessage = user.role === "company" 
        ? "Bem-vindo(a) de volta, LogMene!" 
        : `Bem-vindo(a) de volta, ${user.fullName}!`;
      toast({
        title: "Login realizado com sucesso",
        description: welcomeMessage,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no login",
        description: "Nome de usuário ou senha incorretos",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/user-services?op=auth&subOp=register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user-services"], user);
      const welcomeMessage = user.role === "company" 
        ? "Bem-vindo(a), LogMene!" 
        : `Bem-vindo(a), ${user.fullName}!`;
      toast({
        title: "Cadastro realizado com sucesso",
        description: welcomeMessage,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no cadastro",
        description: "Não foi possível completar o cadastro. Por favor, tente novamente.",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        // Primeiro tenta o endpoint original
        console.log("Tentando logout no endpoint original...");
        await apiRequest("POST", "/api/logout", {});
      } catch (err) {
        console.log("Fallback para o endpoint consolidado...");
        // Fallback para o endpoint consolidado
        await apiRequest("POST", "/api/user-services?op=auth&subOp=logout", {});
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user-services"], null);
      toast({
        title: "Sessão encerrada",
        description: "Você saiu do sistema com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha ao sair",
        description: "Não foi possível encerrar a sessão. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
