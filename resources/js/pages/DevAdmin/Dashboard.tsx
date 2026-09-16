import { Head, Link } from '@inertiajs/react';
import {
    Users,
    Building,
    Activity,
    Clock,
    AlertTriangle,
    Inbox,
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import DevAdminLayout from '@/layouts/DevAdminLayout';
import { TenantStatusBadge } from './Tenants/TenantStatusBadge';

interface DashboardProps {
    stats: {
        total_tenants: number;
        active_tenants: number;
        total_users: number;
        trial_tenants: number;
        trial_expired_tenants: number;
        pending_plan_requests: number;
    };
    recentTenants: any[];
    planRequests: any[];
}

export default function Dashboard({
    stats,
    recentTenants,
    planRequests,
}: DashboardProps) {
    const cards = [
        {
            label: 'Total de Organizações',
            value: stats.total_tenants,
            icon: Building,
            href: '/dev-admin/tenants',
        },
        {
            label: 'Organizações Ativas',
            value: stats.active_tenants,
            icon: Activity,
            href: '/dev-admin/tenants',
        },
        {
            label: 'Total de Usuários',
            value: stats.total_users,
            icon: Users,
            href: null,
        },
        {
            label: 'Em período de teste',
            value: stats.trial_tenants,
            icon: Clock,
            href: '/dev-admin/tenants?filter=trial',
        },
        {
            label: 'Testes expirados',
            value: stats.trial_expired_tenants,
            icon: AlertTriangle,
            href: '/dev-admin/tenants?filter=trial_expired',
            highlight: stats.trial_expired_tenants > 0,
        },
        {
            label: 'Solicitações de plano',
            value: stats.pending_plan_requests,
            icon: Inbox,
            href: '/dev-admin/tenants?filter=plan_requests',
            highlight: stats.pending_plan_requests > 0,
        },
    ];

    return (
        <DevAdminLayout>
            <Head title="Dev Admin Dashboard" />

            <div className="mb-8 grid gap-4 md:grid-cols-3">
                {cards.map((card) => {
                    const content = (
                        <Card
                            className={
                                card.highlight
                                    ? 'border-primary/40 bg-primary/5'
                                    : undefined
                            }
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {card.label}
                                </CardTitle>
                                <card.icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {card.value}
                                </div>
                            </CardContent>
                        </Card>
                    );

                    return card.href ? (
                        <Link
                            key={card.label}
                            href={card.href}
                            className="block transition-opacity hover:opacity-80"
                        >
                            {content}
                        </Link>
                    ) : (
                        <div key={card.label}>{content}</div>
                    );
                })}
            </div>

            {planRequests.length > 0 && (
                <Card className="mb-8 border-primary/30">
                    <CardHeader>
                        <CardTitle>Solicitações de plano pendentes</CardTitle>
                        <CardDescription>
                            Organizações que pediram a contratação de um plano e
                            aguardam ativação.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {planRequests.map((tenant) => (
                                <div
                                    key={tenant.id}
                                    className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 last:border-0 last:pb-0"
                                >
                                    <div>
                                        <p className="font-medium">
                                            {tenant.name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Pediu o plano{' '}
                                            <strong className="capitalize">
                                                {tenant.requested_plan}
                                            </strong>
                                            {tenant.email
                                                ? ` · ${tenant.email}`
                                                : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <TenantStatusBadge tenant={tenant} />
                                        <Link
                                            href={`/dev-admin/tenants/${tenant.id}`}
                                            className="text-sm font-medium text-primary hover:underline"
                                        >
                                            Analisar
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Organizações Recentes</CardTitle>
                    <CardDescription>
                        As últimas 5 organizações cadastradas no sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {recentTenants.map((tenant) => (
                            <div
                                key={tenant.id}
                                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                            >
                                <div>
                                    <p className="font-medium">{tenant.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {tenant.slug}
                                        {tenant.self_registered
                                            ? ' · cadastro próprio'
                                            : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <TenantStatusBadge tenant={tenant} />
                                    <Link
                                        href={`/dev-admin/tenants/${tenant.id}`}
                                        className="text-sm text-primary hover:underline"
                                    >
                                        Detalhes
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </DevAdminLayout>
    );
}
