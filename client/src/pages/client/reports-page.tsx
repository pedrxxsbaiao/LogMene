import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar as CalendarIcon, FileDown, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BottomNavigation } from "@/components/bottom-navigation";
import { useIsMobile } from "@/hooks/use-mobile";

export default function ReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "monthly" | "dateRange">("all");
  const [month, setMonth] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());
  const months = [
    { value: "01", label: "Janeiro" },
    { value: "02", label: "Fevereiro" },
    { value: "03", label: "Março" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Maio" },
    { value: "06", label: "Junho" },
    { value: "07", label: "Julho" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const generateReport = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para gerar relatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let url = "";

      if (filterType === "all") {
        url = `/api/report/client/${user.id}`;
      } else if (filterType === "monthly") {
        url = `/api/report/client/${user.id}/monthly/${month}/${year}`;
      } else if (filterType === "dateRange") {
        if (!startDate || !endDate) {
          toast({
            title: "Erro",
            description: "Selecione as datas de início e fim",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
        const formattedStartDate = startDate.toISOString().split('T')[0];
        const formattedEndDate = endDate.toISOString().split('T')[0];
        url = `/api/report/client/${user.id}?startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
      }

      // Abrir a URL em uma nova janela para baixar o PDF
      window.open(url, '_blank');
      
      toast({
        title: "Sucesso",
        description: "Relatório gerado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao gerar o relatório",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Relatórios" />
      
      <main className="flex-1 container px-4 py-6 lg:py-8">
        <Card>
          <CardHeader>
            <CardTitle>Relatórios de Fretes</CardTitle>
            <CardDescription>
              Gere relatórios detalhados dos seus fretes para controle e acompanhamento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="filter-type">Tipo de Relatório</Label>
                <Select
                  value={filterType}
                  onValueChange={(value) => setFilterType(value as "all" | "monthly" | "dateRange")}
                >
                  <SelectTrigger id="filter-type" className="w-full">
                    <SelectValue placeholder="Selecione o tipo de relatório" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os fretes</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="dateRange">Por período</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filterType === "monthly" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="month">Mês</Label>
                    <Select value={month} onValueChange={setMonth}>
                      <SelectTrigger id="month" className="w-full">
                        <SelectValue placeholder="Selecione o mês" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="year">Ano</Label>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger id="year" className="w-full">
                        <SelectValue placeholder="Selecione o ano" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((y) => (
                          <SelectItem key={y} value={y}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {filterType === "dateRange" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Data Inicial</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          id="startDate"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? formatDate(startDate) : "Selecione a data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="endDate">Data Final</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          id="endDate"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? formatDate(endDate) : "Selecione a data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              <Button 
                className="w-full mt-4" 
                size="lg"
                onClick={generateReport}
                disabled={loading || (filterType === "dateRange" && (!startDate || !endDate))}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <FileDown className="mr-2 h-4 w-4" />
                    Gerar Relatório PDF
                  </>
                )}
              </Button>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-start">
                <FileText className="h-5 w-5 mr-2 mt-0.5 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  <p>Os relatórios incluem informações como:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Status de todos os fretes</li>
                    <li>Origem e destino das cargas</li>
                    <li>Valores de frete</li>
                    <li>Datas de coleta e entrega</li>
                    <li>Resumo com totais e estatísticas</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      
      {isMobile && <BottomNavigation />}
    </div>
  );
}