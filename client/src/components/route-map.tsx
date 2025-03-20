import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface RouteMapProps {
  origin: string;
  destination: string;
  width?: string | number;
  height?: string | number;
  showDistance?: boolean;
}

export function RouteMap({ 
  origin, 
  destination, 
  width = '100%', 
  height = 300,
  showDistance = true
}: RouteMapProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distanceData, setDistanceData] = useState<any | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Função para limpar o endereço e formatar para URL
  const formatAddressForUrl = (address: string) => {
    return encodeURIComponent(address);
  };
  
  // Calcula a distância entre os pontos
  useEffect(() => {
    if (showDistance && origin && destination) {
      setLoading(true);
      axios.post('/api/distance', { origin, destination })
        .then(res => {
          if (res.data.success) {
            setDistanceData(res.data);
          } else {
            console.warn('Erro ao calcular distância:', res.data.error);
          }
        })
        .catch(err => {
          console.error('Erro na requisição de distância:', err);
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

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Rota de Entrega</CardTitle>
        <CardDescription>
          {distanceData?.distanceText && distanceData?.durationText ? (
            <>
              Distância: {distanceData.distanceText} | 
              Tempo estimado: {distanceData.durationText}
            </>
          ) : 'Visualização da rota entre origem e destino'}
        </CardDescription>
      </CardHeader>
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
      {(!error && origin && destination) && (
        <CardFooter className="px-4 py-2 text-xs text-muted-foreground">
          <a 
            href={`https://www.google.com/maps/dir/${formatAddressForUrl(origin)}/${formatAddressForUrl(destination)}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Abrir no Google Maps
          </a>
        </CardFooter>
      )}
    </Card>
  );
}