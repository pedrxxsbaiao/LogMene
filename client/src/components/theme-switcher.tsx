import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Moon } from "lucide-react";

export function ThemeSwitcher() {
  // Aplicar tema escuro no carregamento
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light");
    root.classList.add("dark");
    localStorage.setItem("theme", "dark");
    
    // Força a aplicação do tema escuro em todos os elementos
    document.body.className = "dark";
    document.body.style.backgroundColor = "#0f172a"; // bg-slate-900
    document.body.style.color = "#f8fafc"; // text-slate-50
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full text-white hover:bg-white/20 transition-colors"
      disabled
    >
      <Moon className="h-5 w-5" />
      <span className="sr-only">Tema escuro</span>
    </Button>
  );
}