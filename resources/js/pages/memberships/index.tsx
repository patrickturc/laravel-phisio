import { Head, Link, router } from '@inertiajs/react';
import {
    Plus,
    Search,
    Tag,
    User,
    Calendar as CalendarIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Pagination } from '@/components/pagination';
import { usePermissions } from '@/hooks/use-permissions';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { MembershipFormSheet } from './membership-form-sheet';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Matrículas', href: '/memberships' },
];

export default function MembershipsIndex({
    memberships,
    filters = {},
    patients = [],
    commercialPlans = [],
}: {
    memberships: any;
    filters?: any;
    patients?: any[];
    commercialPlans?: any[];
}) {
    const { can } = usePermissions();

    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');

    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingMembership, setEditingMembership] = useState<any>(null);

    function applyFilters() {
        const params: any = {};
        if (search) params.search = search;
        if (statusFilter) params.status = statusFilter;
        router.get('/memberships', params, {
            preserveState: true,
            replace: true,
        });
    }

    function handleSearchKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter') applyFilters();
    }

    const openCreate = () => {
        setEditingMembership(null);
        setSheetOpen(true);
    };

    const openEdit = (membership: any) => {
        setEditingMembership(membership);
        setSheetOpen(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return (
                    <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        Ativa
                    </span>
                );
            case 'expired':
                return (
                    <span className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        Vencida
                    </span>
                );
            case 'cancelled':
                return (
                    <span className="rounded-md bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                        Cancelada
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Matrículas - Phisio" />
            <div className="mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-6 p-6 md:p-10">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h1 className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                            Matrículas e Planos
                        </h1>
                        <p className="mt-1 text-muted-foreground">
                            Gerencie os planos de assinatura dos seus alunos.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Buscar aluno..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                className="h-10 w-full rounded-xl border border-border bg-card pl-9 text-sm shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                applyFilters();
                            }}
                            className="h-10 rounded-xl border border-border bg-card px-3 text-sm shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                        >
                            <option value="">Todos Status</option>
                            <option value="active">Ativas</option>
                            <option value="expired">Vencidas</option>
                            <option value="cancelled">Canceladas</option>
                        </select>
                        {can('memberships.manage.create') && (
                            <button
                                onClick={openCreate}
                                className="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                            >
                                <Plus className="size-4" />
                                <span className="hidden sm:inline">
                                    Nova Matrícula
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="mt-2 overflow-hidden rounded-2xl border border-border/50 bg-card/60 shadow-sm backdrop-blur-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-border/50 bg-muted/50 text-xs text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">
                                        Aluno
                                    </th>
                                    <th className="hidden px-6 py-4 font-semibold sm:table-cell">
                                        Plano
                                    </th>
                                    <th className="hidden px-6 py-4 font-semibold md:table-cell">
                                        Período
                                    </th>
                                    <th className="px-6 py-4 font-semibold">
                                        Valor
                                    </th>
                                    <th className="px-6 py-4 font-semibold">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-right font-semibold">
                                        Ação
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {memberships.data.length > 0 ? (
                                    memberships.data.map((membership: any) => (
                                        <tr
                                            key={membership.id}
                                            className="transition-colors hover:bg-muted/30"
                                        >
                                            <td className="flex items-center gap-2 px-6 py-4 font-medium">
                                                <div className="rounded-md bg-primary/10 p-1.5">
                                                    <User className="size-4 text-primary" />
                                                </div>
                                                <Link
                                                    href={`/patients/${membership.patient_id}`}
                                                    className="transition-colors hover:text-primary"
                                                >
                                                    {membership.patient?.name}
                                                </Link>
                                            </td>
                                            <td className="hidden px-6 py-4 sm:table-cell">
                                                <div className="flex items-center gap-1.5 font-medium text-foreground/80">
                                                    <Tag className="size-3.5 text-muted-foreground" />
                                                    {membership.commercial_plan
                                                        ?.name ||
                                                        membership.plan_name}
                                                </div>
                                            </td>
                                            <td className="hidden px-6 py-4 whitespace-nowrap text-muted-foreground md:table-cell">
                                                <div className="flex items-center gap-1.5">
                                                    <CalendarIcon className="size-3.5" />
                                                    {new Date(
                                                        membership.start_date,
                                                    ).toLocaleDateString()}{' '}
                                                    a{' '}
                                                    {new Date(
                                                        membership.end_date,
                                                    ).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-emerald-600 dark:text-emerald-400">
                                                R${' '}
                                                {parseFloat(membership.price)
                                                    .toFixed(2)
                                                    .replace('.', ',')}
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(
                                                    membership.status,
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    {can(
                                                        'memberships.manage.edit',
                                                    ) && (
                                                        <button
                                                            onClick={() =>
                                                                openEdit(
                                                                    membership,
                                                                )
                                                            }
                                                            className="text-sm font-medium text-primary hover:text-primary/80"
                                                        >
                                                            Editar
                                                        </button>
                                                    )}
                                                    <Link
                                                        href={`/memberships/${membership.id}`}
                                                        className="text-sm font-medium text-primary hover:text-primary/80"
                                                    >
                                                        Ver Detalhes
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-6 py-12 text-center text-muted-foreground"
                                        >
                                            Nenhuma matrícula encontrada.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {memberships.total > 0 && (
                    <div className="mt-4">
                        <Pagination
                            links={memberships.links}
                            from={memberships.from}
                            to={memberships.to}
                            total={memberships.total}
                        />
                    </div>
                )}
            </div>

            <MembershipFormSheet
                isOpen={sheetOpen}
                setIsOpen={setSheetOpen}
                patients={patients}
                commercialPlans={commercialPlans}
                editingMembership={editingMembership}
            />
        </AppLayout>
    );
}
