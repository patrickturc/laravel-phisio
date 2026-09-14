import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { ShieldAlert, LogOut } from 'lucide-react';

interface ImpersonationData {
    active: boolean;
    tenant_name: string;
    user_name: string;
}

export function ImpersonationBanner() {
    const { impersonation } = usePage<{ impersonation?: ImpersonationData }>().props;

    if (!impersonation?.active) {
        return null;
    }

    const handleLeave = () => {
        router.post('/dev-admin/leave-impersonation');
    };

    return (
        <div className="bg-amber-500 text-amber-950 px-4 py-2.5 flex items-center justify-between shadow-md text-sm font-medium z-50 sticky top-0 border-b border-amber-600">
            <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 shrink-0 text-amber-950 animate-pulse" />
                <span>
                    <strong>Modo Suporte / Dev Admin:</strong> Você está acessando como <strong>{impersonation.user_name}</strong> na organização <strong>{impersonation.tenant_name}</strong>.
                </span>
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={handleLeave}
                className="bg-amber-950 text-white hover:bg-amber-900 border-amber-950 hover:text-white shrink-0 ml-4 font-semibold shadow-xs"
            >
                <LogOut className="h-4 w-4 mr-1.5" />
                Sair e Voltar ao Dev Admin
            </Button>
        </div>
    );
}
