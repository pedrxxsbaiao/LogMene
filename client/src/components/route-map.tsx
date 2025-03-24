import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, MapPin, Clock, Ruler } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distanceData, setDistanceData] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<string>("mapa");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Função para limpar o endereço e formatar para URL
  const formatAddressForUrl = (address: string) => {
    return encodeURIComponent(address);
  };
  
  // Calcula a distância entre os pontos
  useEffect(() => {
    if (showDistance && origin && destination) {
      setLoading(true);
      
      // Usar o método GET para maior compatibilidade
      axios.get(`/api/distance?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`)
        .then(res => {
          if (res.data.success) {
            setDistanceData(res.data);
          } else {
            console.warn('Erro ao calcular distância:', res.data.error);
          }
        })
        .catch(err => {
          console.error('Erro na requisição de distância:', err);
          // Tentar via POST como fallback
          return axios.post('/api/distance', { origin, destination });
        })
        .then(res => {
          if (res?.data?.success) {
            setDistanceData(res.data);
          }
        })
        .catch(err => {
          console.error('Erro na requisição de distância (fallback):', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [origin, destination, showDistance]);
  
  // Quando o iframe for carregado
  const handleIframeLoad = () => {
    setLoading(false);
  };
  
  // Se o iframe falhar ao carregar
  const handleIframeError = () => {
    setLoading(false);
    setError('Não foi possível carregar o mapa. Verifique sua conexão.');
  };
  
  // URL do Google Maps para o iframe
  const mapUrl = `https://www.google.com/maps/embed/v1/directions?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}&origin=${formatAddressForUrl(origin)}&destination=${formatAddressForUrl(destination)}&mode=driving`;

  // URL do Street View
  const streetViewUrl = `https://www.google.com/maps/embed/v1/streetview?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}&location=${formatAddressForUrl(destination)}&heading=210&pitch=10&fov=90`;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>{title}</CardTitle>
          {distanceData?.distance && (
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="font-normal flex items-center gap-1">
                <Ruler className="h-3 w-3" />
                {distanceData.distanceText}
              </Badge>
              {distanceData?.durationText && (
                <Badge variant="outline" className="font-normal flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {distanceData.durationText}
                </Badge>
              )}
            </div>
          )}
        </div>
        <CardDescription>
          {interactive ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-[200px]">{origin}</span>
              <span className="mx-1">→</span>
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-[200px]">{destination}</span>
            </div>
          ) : (
            distanceData?.distanceText && distanceData?.durationText ? (
              <>
                Distância: {distanceData.distanceText} | 
                Tempo estimado: {distanceData.durationText}
              </>
            ) : 'Visualização da rota entre origem e destino'
          )}
        </CardDescription>
      </CardHeader>
      
      {interactive ? (
        <Tabs defaultValue="mapa" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mx-4 grid grid-cols-2">
            <TabsTrigger value="mapa">Mapa da Rota</TabsTrigger>
            <TabsTrigger value="destino">Destino</TabsTrigger>
          </TabsList>
          <TabsContent value="mapa" className="p-0 relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {error ? (
              <div className="p-6 text-center text-destructive">
                <p>{error}</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => window.open(`https://www.google.com/maps/dir/${formatAddressForUrl(origin)}/${formatAddressForUrl(destination)}`, '_blank')}
                >
                  Abrir no Google Maps
                </Button>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                title="Route Map"
                width={width}
                height={height}
                frameBorder="0"
                src={mapUrl}
                allowFullScreen
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                style={{ borderRadius: 0 }}
              />
            )}
          </TabsContent>
          <TabsContent value="destino" className="p-0">
            <iframe
              title="Street View"
              width={width}
              height={height}
              frameBorder="0"
              src={streetViewUrl}
              allowFullScreen
              style={{ borderRadius: 0 }}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <CardContent className="p-0 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {error ? (
            <div className="p-6 text-center text-destructive">
              <p>{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.open(`https://www.google.com/maps/dir/${formatAddressForUrl(origin)}/${formatAddressForUrl(destination)}`, '_blank')}
              >
                Abrir no Google Maps
              </Button>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              title="Route Map"
              width={width}
              height={height}
              frameBorder="0"
              src={mapUrl}
              allowFullScreen
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              style={{ borderRadius: 0 }}
            />
          )}
        </CardContent>
      )}
      
      {(!error && origin && destination) && (
        <CardFooter className="px-4 py-2 text-xs text-muted-foreground justify-between">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a 
                  href={`https://www.google.com/maps/dir/${formatAddressForUrl(origin)}/${formatAddressForUrl(destination)}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Abrir no Google Maps
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Visualizar rota completa no Google Maps</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {interactive && (
            <span className="text-[10px]">Powered by Google Maps</span>
          )}
        </CardFooter>
      )}
    </Card>
  );
}