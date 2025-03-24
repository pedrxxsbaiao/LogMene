import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, MapPin, ArrowDownRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface RouteMapProps {
  origin: string;
  destination: string;
  width?: string | number;
  height?: string | number;
  showDistance?: boolean;
  title?: string;
  interactive?: boolean;
}

export function RouteMap({ 
  origin, 
  destination, 
  width = '100%', 
  height = 300,
  showDistance = true,
  title = "Rota de Entrega",
  interactive = true
}: RouteMapProps) {
  // Função para limpar o endereço e formatar para URL
  const formatAddressForUrl = (address: string) => {
    return encodeURIComponent(address);
  };
  
  // Extrai as informações principais do endereço
  const getAddressMainParts = (address: string) => {
    const parts = address.split(',');
    const cityStateIndex = parts.findIndex(part => 
      part.trim().includes('SP') || 
      part.trim().includes('RJ') || 
      part.trim().includes('MG') ||
      part.trim().toUpperCase().includes('SÃO PAULO') ||
      part.trim().toUpperCase().includes('SAO PAULO')
    );
    
    if (cityStateIndex >= 0) {
      const streetPart = parts.slice(0, cityStateIndex).join(',').trim();
      const cityStatePart = parts[cityStateIndex].trim();
      return { street: streetPart, cityState: cityStatePart };
    }
    
    // Fallback se não encontrar cidade/estado
    if (parts.length > 1) {
      return { 
        street: parts[0].trim(), 
        cityState: parts.slice(1).join(',').trim() 
      };
    }
    
    return { street: address, cityState: '' };
  };
  
  const originParts = getAddressMainParts(origin);
  const destinationParts = getAddressMainParts(destination);
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4">
          {/* Origem */}
          <div className="flex">
            <div className="mr-3 mt-1">
              <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">
                <MapPin className="h-3.5 w-3.5 text-primary" />
              </Badge>
            </div>
            <div className="flex-1">
              <div className="text-base font-medium">{originParts.street}</div>
              <div className="text-sm text-muted-foreground">{originParts.cityState}</div>
            </div>
          </div>
          
          {/* Linha conectora */}
          <div className="flex pl-3">
            <div className="border-l-2 h-8 border-dashed border-muted-foreground ml-3"></div>
          </div>
          
          {/* Destino */}
          <div className="flex">
            <div className="mr-3 mt-1">
              <Badge className="h-6 w-6 rounded-full p-0 flex items-center justify-center bg-destructive hover:bg-destructive">
                <MapPin className="h-3.5 w-3.5 text-white" />
              </Badge>
            </div>
            <div className="flex-1">
              <div className="text-base font-medium">{destinationParts.street}</div>
              <div className="text-sm text-muted-foreground">{destinationParts.cityState}</div>
            </div>
          </div>
          
          {/* Informações adicionais */}
          <div className="rounded-lg bg-muted/40 p-3 mt-4">
            <h4 className="text-sm font-medium mb-2 flex items-center">
              <ArrowDownRight className="h-4 w-4 mr-1" />
              Informações da Rota
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Cidade Origem</span>
                <span className="font-medium">{originParts.cityState}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Cidade Destino</span>
                <span className="font-medium">{destinationParts.cityState}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="justify-end bg-muted/30 border-t">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&origin=${formatAddressForUrl(origin)}&destination=${formatAddressForUrl(destination)}&travelmode=driving`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Ver no Google Maps
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Abrir esta rota no Google Maps em uma nova aba
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
}