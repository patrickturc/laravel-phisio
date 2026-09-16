import { Head, Link, router, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { ClipboardList, Search, Plus, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { Pagination } from '@/components/pagination';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { usePermissions } from '@/hooks/use-permissions';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Protocolos Clínicos', href: '/clinical-protocols' },
];

interface PaginatedProtocols {
    data: any[];
    links: any[];
    from: number | null;
    to: number | null;
    total: number;
}

export default function ClinicalProtocolsIndex({
    protocols,
    filters = {},
}: {
    protocols: PaginatedProtocols;
    filters?: any;
}) {
    const { can } = usePermissions();
    const [search, setSearch] = useState(filters.search || '');

    const [isSheetOpen, setSheetOpen] = useState(false);
    const [mode, setMode] = useState<'create' | 'edit'>('create');
    const [editingId, setEditingId] = useState<string | null>(null);

    const { data, setData, post, put, processing, errors, clearErrors } =
        useForm({
            name: '',
            description: '',
            total_sessions: 10 as number | '',
            notes: '',
        });

    function openCreate() {
        setMode('create');
        setData({
            name: '',
            description: '',
            total_sessions: 10,
            notes: '',
        });
        clearErrors();
        setEditingId(null);
        setSheetOpen(true);
    }

    function openEdit(protocol: any) {
        setMode('edit');
        clearErrors();
        setEditingId(protocol.id);
        setData({
            name: protocol.name,
            description: protocol.description || '',
            total_sessions: protocol.total_sessions || '',
            notes: protocol.notes || '',
        });
        setSheetOpen(true);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (mode === 'create') {
            post('/clinical-protocols', {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setSheetOpen(false),
            });
        } else {
            put(`/clinical-protocols/${editingId}`, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setSheetOpen(false),
            });
        }
    }

    function applyFilters(overrides?: any) {
        const params: any = {};
        const s = overrides?.search ?? search;
        if (s) params.search = s;
        router.get('/clinical-protocols', params, {
            preserveState: true,
            replace: true,
        });
    }

    function clearFilters() {
        setSearch('');
        router.get(
            '/clinical-protocols',
            {},
            { preserveState: true, replace: true },
        );
    }

    const hasFilters = !!filters.search;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Protocolos Clínicos - Phisio" />
            <div className="mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-6 p-6 md:p-10">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h1 className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                            Protocolos Clínicos
                        </h1>
                        <p className="mt-1 text-muted-foreground">
                            Gerencie os protocolos e procedimentos clínicos da
                            sua clínica.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Buscar protocolo..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) =>
                                    e.key === 'Enter' && applyFilters()
                                }
                                className="h-10 w-full rounded-xl border border-border bg-card pl-9 text-sm shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                            />
                        </div>
                        {hasFilters && (
                            <button
                                onClick={clearFilters}
                                className="h-10 rounded-xl border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                            >
                                Limpar
                            </button>
                        )}
                        {can('treatment_plans.manage.create') && (
                            <button
                                onClick={openCreate}
                                className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                            >
                                <Plus className="size-4" />
                                <span className="hidden sm:inline">
                                    Novo Protocolo
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {protocols.data.length > 0 ? (
                        protocols.data.map((protocol: any, i: number) => {
                            return (
                                <motion.div
                                    key={protocol.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="group flex flex-col justify-between rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl transition-all hover:shadow-lg"
                                >
                                    <div>
                                        <h3 className="mb-1 text-lg font-bold text-foreground">
                                            {protocol.name}
                                        </h3>
                                        {protocol.total_sessions && (
                                            <p className="mb-3 text-sm font-medium text-emerald-600">
                                                {protocol.total_sessions}{' '}
                                                sessões sugeridas
                                            </p>
                                        )}
                                        <p className="line-clamp-3 text-sm text-muted-foreground">
                                            {protocol.description ||
                                                'Nenhuma descrição fornecida.'}
                                        </p>
                                    </div>

                                    <div className="mt-6 flex items-center justify-between gap-4">
                                        <Link
                                            href={`/clinical-protocols/${protocol.id}`}
                                            className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-emerald-500"
                                        >
                                            Detalhes →
                                        </Link>
                                        {can('treatment_plans.manage.edit') && (
                                            <button
                                                onClick={() =>
                                                    openEdit(protocol)
                                                }
                                                className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
                                            >
                                                <Edit2 className="size-4" />{' '}
                                                Editar
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="col-span-full flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/30 py-24 text-center">
                            <ClipboardList className="mb-4 size-12 text-muted-foreground/40" />
                            <h3 className="mb-2 text-xl font-bold">
                                Nenhum protocolo encontrado
                            </h3>
                            <p className="text-muted-foreground">
                                Cadastre procedimentos como RPG, Pilates,
                                Acupuntura, etc.
                            </p>
                        </div>
                    )}
                </div>

                {protocols.total > 0 && (
                    <Pagination
                        links={protocols.links}
                        from={protocols.from}
                        to={protocols.to}
                        total={protocols.total}
                    />
                )}
            </div>

            <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent className="w-full overflow-y-auto sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>
                            {mode === 'create'
                                ? 'Novo Protocolo Clínico'
                                : 'Editar Protocolo'}
                        </SheetTitle>
                    </SheetHeader>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">
                                Nome do Protocolo *
                            </label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm"
                                placeholder="Ex: Acupuntura, RPG, Pilates Clínico"
                            />
                            {errors.name && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">
                                Descrição / Objetivo Geral
                            </label>
                            <textarea
                                value={data.description}
                                onChange={(e) =>
                                    setData('description', e.target.value)
                                }
                                rows={3}
                                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm"
                                placeholder="Descreva o procedimento e seus objetivos gerais..."
                            />
                            {errors.description && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.description}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">
                                Total de Sessões Padrão
                            </label>
                            <input
                                type="number"
                                value={data.total_sessions}
                                onChange={(e) =>
                                    setData(
                                        'total_sessions',
                                        e.target.value
                                            ? parseInt(e.target.value)
                                            : '',
                                    )
                                }
                                min={1}
                                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm"
                                placeholder="Opcional. Ex: 10"
                            />
                            {errors.total_sessions && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.total_sessions}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">
                                Observações Adicionais
                            </label>
                            <textarea
                                value={data.notes}
                                onChange={(e) =>
                                    setData('notes', e.target.value)
                                }
                                rows={3}
                                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm"
                                placeholder="Qualquer nota técnica sobre o protocolo..."
                            />
                            {errors.notes && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.notes}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={processing}
                                className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
                            >
                                {mode === 'create'
                                    ? 'Salvar Protocolo'
                                    : 'Salvar Alterações'}
                            </button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
        </AppLayout>
    );
}
