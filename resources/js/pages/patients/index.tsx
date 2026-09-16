import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { UserPlus, Search, Edit, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Pagination } from '@/components/pagination';
import { usePermissions } from '@/hooks/use-permissions';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { PatientFormSheet } from './PatientFormSheet';
import type { Patient } from './PatientFormSheet';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Pacientes', href: '/patients' },
];

interface PaginatedPatients {
    data: any[];
    links: any[];
    from: number | null;
    to: number | null;
    total: number;
}

export default function PatientsIndex({
    patients,
    filters = {},
}: {
    patients: PaginatedPatients;
    filters?: any;
}) {
    const [search, setSearch] = useState(filters.search || '');
    const [typeFilter, setTypeFilter] = useState(filters.type || '');
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
    const { can } = usePermissions();

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('create') === 'true') {
            setIsSheetOpen(true);
            const url = new URL(window.location.href);
            url.searchParams.delete('create');
            window.history.replaceState({}, '', url);
        }
    }, []);

    function applyFilters() {
        router.get(
            '/patients',
            {
                ...(search ? { search } : {}),
                ...(typeFilter ? { type: typeFilter } : {}),
            },
            { preserveState: true, replace: true },
        );
    }

    function handleSearchKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter') applyFilters();
    }

    function clearFilters() {
        setSearch('');
        setTypeFilter('');
        router.get('/patients', {}, { preserveState: true, replace: true });
    }

    const hasFilters = filters.search || filters.type;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pacientes - Phisio" />

            <div className="mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-6 p-6 md:p-10">
                {/* Header section */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h1 className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                            Pacientes
                        </h1>
                        <p className="mt-1 text-muted-foreground">
                            Gerencie os cadastros e informações dos seus
                            pacientes.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Buscar paciente..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                className="h-10 w-full rounded-xl border border-border bg-card pl-9 text-sm shadow-sm transition-all focus:ring-2 focus:ring-primary/50 focus:outline-none"
                            />
                        </div>
                        <select
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                setTimeout(
                                    () =>
                                        router.get(
                                            '/patients',
                                            {
                                                ...(search ? { search } : {}),
                                                ...(e.target.value
                                                    ? { type: e.target.value }
                                                    : {}),
                                            },
                                            {
                                                preserveState: true,
                                                replace: true,
                                            },
                                        ),
                                    0,
                                );
                            }}
                            className="h-10 rounded-xl border border-border bg-card px-3 text-sm shadow-sm transition-all focus:ring-2 focus:ring-primary/50 focus:outline-none"
                        >
                            <option value="">Todos</option>
                            <option value="pilates">Pilates</option>
                            <option value="physiotherapy">Fisioterapia</option>
                        </select>
                        {hasFilters && (
                            <button
                                onClick={clearFilters}
                                className="h-10 rounded-xl border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                            >
                                Limpar
                            </button>
                        )}
                        {can('patients.manage.create') && (
                            <button
                                onClick={() => {
                                    setEditingPatient(null);
                                    setIsSheetOpen(true);
                                }}
                                className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                            >
                                <UserPlus className="size-4" />
                                <span className="hidden sm:inline">
                                    Novo Paciente
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Table/List section with Glassmorphism */}
                <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] backdrop-blur-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-border/50 bg-muted/30 text-xs font-medium text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-6 py-4">Nome</th>
                                    <th className="hidden px-6 py-4 md:table-cell">
                                        CPF
                                    </th>
                                    <th className="hidden px-6 py-4 sm:table-cell">
                                        Telefone
                                    </th>
                                    <th className="px-6 py-4 text-center">
                                        Categoria
                                    </th>
                                    <th className="hidden px-6 py-4 text-center lg:table-cell">
                                        Plano
                                    </th>
                                    <th className="px-6 py-4 text-right">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {patients.data.length > 0 ? (
                                    patients.data.map(
                                        (patient: any, index: number) => (
                                            <motion.tr
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{
                                                    delay: index * 0.03,
                                                }}
                                                key={patient.id}
                                                onClick={() =>
                                                    router.visit(
                                                        `/patients/${patient.id}`,
                                                    )
                                                }
                                                className="group cursor-pointer border-b border-border/30 transition-colors hover:bg-muted/30"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-emerald-500/10 font-bold text-primary shadow-inner">
                                                            {(
                                                                patient.nickname ||
                                                                patient.name ||
                                                                '?'
                                                            )
                                                                .charAt(0)
                                                                .toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <Link
                                                                href={`/patients/${patient.id}`}
                                                                onClick={(e) =>
                                                                    e.stopPropagation()
                                                                }
                                                                className="block truncate font-medium text-foreground transition-colors hover:text-primary"
                                                            >
                                                                {patient.name}
                                                            </Link>
                                                            {patient.nickname && (
                                                                <p className="truncate text-xs text-muted-foreground">
                                                                    "
                                                                    {
                                                                        patient.nickname
                                                                    }
                                                                    "
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="hidden px-6 py-4 text-muted-foreground md:table-cell">
                                                    {patient.cpf || '-'}
                                                </td>
                                                <td className="hidden px-6 py-4 text-muted-foreground sm:table-cell">
                                                    {patient.phone || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                            patient.type ===
                                                            'pilates'
                                                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                                                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                        }`}
                                                    >
                                                        {patient.type ===
                                                        'pilates'
                                                            ? 'Pilates'
                                                            : 'Fisioterapia'}
                                                    </span>
                                                </td>
                                                <td className="hidden px-6 py-4 text-center lg:table-cell">
                                                    {patient.active_membership ? (
                                                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                                                            ✓{' '}
                                                            {
                                                                patient
                                                                    .active_membership
                                                                    .plan_name
                                                            }
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                                                            Sem Plano
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Link
                                                            href={`/patients/${patient.id}`}
                                                            className="rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-emerald-500/10 hover:text-emerald-500"
                                                            title="Ver Paciente e Evoluções"
                                                        >
                                                            <FileText className="size-4" />
                                                        </Link>
                                                        {can(
                                                            'patients.manage.edit',
                                                        ) && (
                                                            <button
                                                                onClick={(
                                                                    e,
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    setEditingPatient(
                                                                        patient,
                                                                    );
                                                                    setIsSheetOpen(
                                                                        true,
                                                                    );
                                                                }}
                                                                className="rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                                                                title="Editar Paciente"
                                                            >
                                                                <Edit className="size-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ),
                                    )
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-6 py-16 text-center text-muted-foreground"
                                        >
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted/50">
                                                    <Search className="size-6 text-muted-foreground/50" />
                                                </div>
                                                <p className="text-base font-medium text-foreground">
                                                    Pacientes não encontrados
                                                </p>
                                                <p className="text-sm">
                                                    Não há ninguém aqui com esse
                                                    nome ou cpf.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {patients.total > 0 && (
                        <div className="border-t border-border/30 px-6">
                            <Pagination
                                links={patients.links}
                                from={patients.from}
                                to={patients.to}
                                total={patients.total}
                            />
                        </div>
                    )}
                </div>
            </div>

            <PatientFormSheet
                key={editingPatient ? editingPatient.id : 'new'}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                patient={editingPatient}
            />
        </AppLayout>
    );
}
