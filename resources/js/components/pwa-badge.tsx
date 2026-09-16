import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './ui/button';

export default function PwaBadge() {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisterError(error) {
            console.error('SW registration error', error);
        },
    });

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isOffline && !needRefresh) {
        return null;
    }

    return (
        <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
            {isOffline && (
                <div className="flex animate-in items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow-lg slide-in-from-bottom-2">
                    <WifiOff className="size-4" />
                    Você está offline
                </div>
            )}

            {needRefresh && (
                <div className="flex animate-in flex-col gap-2 rounded-lg border bg-background px-4 py-3 text-sm shadow-xl slide-in-from-bottom-2">
                    <div className="font-medium">
                        Nova atualização disponível!
                    </div>
                    <div className="mb-1 text-muted-foreground">
                        Recarregue para ver as novidades.
                    </div>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            onClick={() => updateServiceWorker(true)}
                        >
                            Atualizar Agora
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setNeedRefresh(false)}
                        >
                            Depois
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
