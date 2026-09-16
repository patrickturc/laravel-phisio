import { usePage, router } from '@inertiajs/react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImpersonationData {
    active: boolean;
    tenant_name: string;
    user_name: string;
}

export function ImpersonationBanner() {
    const { impersonation } = usePage<{ impersonation?: ImpersonationData }>()
        .props;

    if (!impersonation?.active) {
        return null;
    }

    const handleLeave = () => {
        router.post('/dev-admin/leave-impersonation');
    };

    return (
        <div className="sticky top-0 z-50 flex items-center justify-between border-b border-amber-600 bg-amber-500 px-4 py-2.5 text-sm font-medium text-amber-950 shadow-md">
            <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 shrink-0 animate-pulse text-amber-950" />
                <span>
                    <strong>Modo Suporte / Dev Admin:</strong> Você está
                    acessando como <strong>{impersonation.user_name}</strong> na
                    organização <strong>{impersonation.tenant_name}</strong>.
                </span>
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={handleLeave}
                className="ml-4 shrink-0 border-amber-950 bg-amber-950 font-semibold text-white shadow-xs hover:bg-amber-900 hover:text-white"
            >
                <LogOut className="mr-1.5 h-4 w-4" />
                Sair e Voltar ao Dev Admin
            </Button>
        </div>
    );
}
