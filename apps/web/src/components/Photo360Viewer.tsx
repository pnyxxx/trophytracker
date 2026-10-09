import { useEffect, useRef, useState } from 'react';
import { Viewer } from '@photo-sphere-viewer/core';
import '@photo-sphere-viewer/core/index.css';
import { Maximize2, Minimize2, RotateCw, X, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

interface Photo360ViewerProps {
  imageUrl: string;
  title: string;
  description?: string;
  onClose?: () => void;
}

export const Photo360Viewer = ({ imageUrl, title, description, onClose }: Photo360ViewerProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);

  // Gestion de la touche Escape
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onClose]);

  // Initialisation et gestion du viewer 360°
  useEffect(() => {
    if (!viewerContainerRef.current || !imageUrl) {
      // console.error('Container ou imageUrl manquant', { container: viewerContainerRef.current, imageUrl });
      return;
    }

    setIsLoading(true);
    setError(null);

    // Nettoyage du viewer précédent s'il existe
    if (viewerRef.current) {
      try {
        viewerRef.current.destroy();
        viewerRef.current = null;
      } catch (err) {
        // console.error('Erreur lors de la destruction du viewer:', err);
      }
    }

    // Petit délai pour s'assurer que le DOM est prêt
    const timer = setTimeout(() => {
      try {
        // console.log('Initialisation du viewer avec l\'URL:', imageUrl);

        // Vérification que le container est toujours là
        if (!viewerContainerRef.current) {
          // console.error('Le container a disparu');
          return;
        }

        // Création du nouveau viewer (avec loader par défaut)
        viewerRef.current = new Viewer({
          container: viewerContainerRef.current,
          panorama: imageUrl,
          navbar: false,
          mousewheel: true,
          mousemove: true,
          touchmoveTwoFingers: false,
          defaultZoomLvl: 50,
          size: {
            width: '100%',
            height: '100%',
          },
        });

        // Gestion des événements du viewer
        viewerRef.current.addEventListener('ready', () => {
          // console.log('Viewer prêt');
          setIsLoading(false);
          setError(null);
        });

        viewerRef.current.addEventListener('panorama-error', (error) => {
          // console.error('Erreur de chargement du panorama:', error);
          setIsLoading(false);
          setError('Impossible de charger l\'image 360°. Vérifie l\'adresse ou le format de l\'image.');
        });

      } catch (err) {
        // console.error('Erreur lors de l\'initialisation du viewer:', err);
        setIsLoading(false);
        setError('Erreur lors de l\'initialisation du viewer 360°');
      }
    }, 100);

    // Cleanup
    return () => {
      clearTimeout(timer);
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
          viewerRef.current = null;
        } catch (err) {
          // console.error('Erreur lors du nettoyage:', err);
        }
      }
    };
  }, [imageUrl]);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const resetRotation = () => {
    if (viewerRef.current) {
      try {
        viewerRef.current.animate({
          yaw: 0,
          pitch: 0,
          zoom: 50,
          speed: '10rpm',
        });
      } catch (err) {
        // console.error('Erreur lors de la réinitialisation:', err);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full h-[500px] md:h-[600px]'
      }`}
    >
      {/* Header Controls */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-2xl font-extrabold text-cream md:text-3xl">{title}</h3>
            {description && (
              <p className="text-dust-200 text-sm mt-1 hidden md:block">{description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={resetRotation}
              className="bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm"
              title="Réinitialiser la rotation"
              disabled={isLoading || !!error}
            >
              <RotateCw className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm"
              title={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
              disabled={isLoading || !!error}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 360° Image Viewer Container */}
      <div ref={viewerContainerRef} className="w-full h-full" />

      {/* Loader par défaut du viewer conservé, aucun overlay personnalisé */}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/80 z-10">
          <div className="text-center max-w-md px-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-white text-lg font-semibold mb-2">Erreur de chargement</p>
            <p className="text-dust-200 text-sm">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-6"
              variant="secondary"
            >
              Rafraîchir la page
            </Button>
          </div>
        </div>
      )}

      {/* Bottom Instruction */}
      {!isLoading && !error && (
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/60 to-transparent">
          <p className="text-center text-white/80 text-sm">
            <span className="hidden md:inline">🖱️ Glisse pour explorer</span>
            <span className="md:hidden">👆 Glisse pour explorer</span>
          </p>
        </div>
      )}
    </div>
  );
};
