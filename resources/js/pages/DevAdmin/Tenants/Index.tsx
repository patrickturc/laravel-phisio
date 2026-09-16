import { Head, Link, router } from '@inertiajs/react';
import { PlusCircle, LogIn, Search, Inbox } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import DevAdminLayout from '@/layouts/DevAdminLayout';
import { TenantFormSheet } from './TenantFormSheet';
import { TenantStatusBadge } from './TenantStatusBadge';

interface IndexProps {
    tenants: {
        data: any[];
        links: any[];
        current_page: number;
        last_page: number;
    };
    filters: {
        filter: string | null;
        search: string | null;
    };
    counts: {
        all: number;
        trial: number;
        trial_expired: number;
        plan_requests: number;
        self_registered: number;
        paid: number;
    };
}

export default function Index({ tenants, filters, counts }: IndexProps) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<any | null>(null);
    const [search, setSearch] = useState(filters.search ?? '');

    const tabs = [
        { key: null, label: 'Todas', count: counts.all },
        {
            key: 'plan_requests',
            label: 'Solicitações',
            count: counts.plan_requests,
        },
        { key: 'trial', label: 'Em teste', count: counts.trial },
        {
            key: 'trial_expired',
            label: 'Teste expirado',
            count: counts.trial_expired,
        },
        {
            key: 'self_registered',
            label: 'Cadastro próprio',
            count: counts.self_registered,
        },
        { key: 'paid', label: 'Pagantes', count: counts.paid },
    ];

    const applyFilter = (key: string | null) => {
        router.get(
            '/dev-admin/tenants',
            { filter: key ?? undefined, search: search || undefined },
            { preserveState: true, replace: true },
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/dev-admin/tenants',
            {
                filter: filters.filter ?? undefined,
                search: search || undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    const handleToggleStatus = (id: string) => {
        if (
            confirm(
                'Tem certeza que deseja alterar o status desta organização?',
            )
        ) {
            router.post(
                `/dev-admin/tenants/${id}/toggle-status`,
                {},
                { preserveScroll: true },
            );
        }
    };

    const handleImpersonate = (tenant: any) => {
        if (
            confirm(`Deseja acessar o sistema como a clínica "${tenant.name}"?`)
        ) {
            router.post(`/dev-admin/tenants/${tenant.id}/impersonate`);
        }
    };

    const handleApprovePlan = (tenant: any) => {
        const plan = tenant.requested_plan ?? 'basic';

        if (
            confirm(
                `Ativar o plano "${plan}" para "${tenant.name}"? O período de teste será encerrado.`,
            )
        ) {
            router.post(
                `/dev-admin/tenants/${tenant.id}/approve-plan`,
                { plan },
                { preserveScroll: true },
            );
        }
    };

    const handleOpenCreate = () => {
        setSelectedTenant(null);
        setIsDrawerOpen(true);
    };

    const handleOpenEdit = (tenant: any) => {
        setSelectedTenant(tenant);
        setIsDrawerOpen(true);
    };

    return (
        <DevAdminLayout>
            <Head title="Gerenciar Organizações" />

            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                        Organizações
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Gerencie todas as clínicas cadastradas na plataforma.
                    </p>
                </div>
                <Button onClick={handleOpenCreate} className="gap-2">
                    <PlusCircle className="h-4 w-4" /> Nova Organização
                </Button>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                    {tabs.map((tab) => {
                        const active = (filters.filter ?? null) === tab.key;

                        return (
                            <button
                                key={tab.label}
                                type="button"
                                onClick={() => applyFilter(tab.key)}
                                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                                    active
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {tab.label}
                                <span
                                    className={`ml-1.5 text-xs ${active ? 'opacity-80' : 'opacity-60'}`}
                                >
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <form
                    onSubmit={handleSearch}
                    className="flex items-center gap-2"
                >
                    <div className="relative">
                        <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nome ou e-mail"
                            className="w-56 pl-8"
                        />
                    </div>
                    <Button type="submit" variant="outline" size="sm">
                        Buscar
                    </Button>
                </form>
            </div>

            <div className="rounded-md border bg-background">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Origem</TableHead>
                            <TableHead>Usuários Max</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tenants.data.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={6}
                                    className="py-10 text-center text-muted-foreground"
                                >
                                    Nenhuma organização encontrada para este
                                    filtro.
                                </TableCell>
                            </TableRow>
                        )}
                        {tenants.data.map((tenant) => (
                            <TableRow key={tenant.id}>
                                <TableCell>
                                    <div className="font-medium">
                                        {tenant.name}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {tenant.slug}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="capitalize">
                                        {tenant.plan}
                                    </div>
                                    {tenant.has_pending_plan_request && (
                                        <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary">
                                            <Inbox className="h-3 w-3" />
                                            Pediu {tenant.requested_plan}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <TenantStatusBadge tenant={tenant} />
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {tenant.self_registered
                                        ? 'Cadastro próprio'
                                        : 'Dev admin'}
                                </TableCell>
                                <TableCell>{tenant.max_users}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        {tenant.has_pending_plan_request && (
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    handleApprovePlan(tenant)
                                                }
                                                className="font-semibold"
                                                title="Ativar o plano solicitado"
                                            >
                                                Ativar plano
                                            </Button>
                                        )}
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() =>
                                                handleImpersonate(tenant)
                                            }
                                            className="gap-1 bg-indigo-50 font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300"
                                            title="Acessar como Clínica"
                                        >
                                            <LogIn className="h-3.5 w-3.5" />
                                            Acessar
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
                                            <Link
                                                href={`/dev-admin/tenants/${tenant.id}`}
                                            >
                                                Ver
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                handleOpenEdit(tenant)
                                            }
                                        >
                                            Editar
                                        </Button>
                                        <Button
                                            variant={
                                                tenant.status === 'active'
                                                    ? 'destructive'
                                                    : 'default'
                                            }
                                            size="sm"
                                            onClick={() =>
                                                handleToggleStatus(tenant.id)
                                            }
                                        >
                                            {tenant.status === 'active'
                                                ? 'Suspender'
                                                : 'Ativar'}
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {tenants.last_page > 1 && (
                <div className="mt-4 flex flex-wrap justify-center gap-1">
                    {tenants.links.map((link: any, i: number) => (
                        <Button
                            key={i}
                            variant={link.active ? 'default' : 'outline'}
                            size="sm"
                            disabled={!link.url}
                            onClick={() =>
                                link.url &&
                                router.visit(link.url, { preserveState: true })
                            }
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </div>
            )}

            {/* Drawer Lateral de Cadastro e Edição de Organização */}
            <TenantFormSheet
                open={isDrawerOpen}
                onOpenChange={setIsDrawerOpen}
                tenant={selectedTenant}
            />
        </DevAdminLayout>
    );
}
