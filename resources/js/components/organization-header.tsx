import { Link } from '@inertiajs/react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { usePermissions } from '@/hooks/use-permissions';

const TABS = [
    { title: 'Informações', href: '/settings/organization', permission: null },
    {
        title: 'Agenda',
        href: '/settings/schedule',
        permission: 'appointments.settings.manage',
    },
    { title: 'Plano', href: '/settings/billing', permission: null },
];

/**
 * Shared header of the clinic profile pages: the profile form, the agenda
 * settings and the plan / billing page are tabs of the same "Perfil da
 * Clínica".
 */
export function OrganizationHeader() {
    const { isCurrentUrl } = useCurrentUrl();
    const { can } = usePermissions();

    return (
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Perfil da Clínica
                </h1>
                <p className="mt-1 text-muted-foreground">
                    Gerencie as informações do seu negócio, marca e contato.
                </p>
            </div>
            <nav className="flex w-fit rounded-xl border border-border/50 bg-muted/50 p-1">
                {TABS.filter(
                    (tab) => tab.permission === null || can(tab.permission),
                ).map((tab) => (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        prefetch
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                            isCurrentUrl(tab.href)
                                ? 'border border-border/50 bg-background text-primary shadow-sm'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                        {tab.title}
                    </Link>
                ))}
            </nav>
        </div>
    );
}
