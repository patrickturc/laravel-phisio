import { Head, router, useForm } from '@inertiajs/react';
import { Plus, Tag, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useConfirmModal } from '@/components/confirm-modal';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { usePermissions } from '@/hooks/use-permissions';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface CommercialPlan {
    id: string;
    name: string;
    price: string;
    duration_months: number | null;
    sessions_total: number | null;
    sessions_per_week: number | null;
    description: string | null;
    category: 'fisioterapia' | 'pilates' | 'teste';
}

export default function CommercialPlansIndex({
    plans,
}: {
    plans: CommercialPlan[];
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Planos Comerciais', href: '/commercial-plans' },
    ];

    const { can } = usePermissions();
    const { confirm, modal } = useConfirmModal();

    const handleDelete = async (plan: CommercialPlan) => {
        const confirmed = await confirm({
            title: 'Excluir Plano',
            message: `Tem certeza que deseja excluir o plano "${plan.name}"?`,
            confirmLabel: 'Excluir',
        });
        if (confirmed) router.delete(`/commercial-plans/${plan.id}`);
    };

    const [sheetOpen, setSheetOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm({
            name: '',
            price: '',
            duration_months: '',
            sessions_total: '',
            sessions_per_week: '',
            description: '',
            category: 'fisioterapia',
        });

    const openCreateSheet = () => {
        setIsEditing(false);
        setEditingId(null);
        setData({
            name: '',
            price: '',
            duration_months: '',
            sessions_total: '',
            sessions_per_week: '',
            description: '',
            category: 'fisioterapia',
        });
        clearErrors();
        setSheetOpen(true);
    };

    const openEditSheet = (plan: CommercialPlan) => {
        setIsEditing(true);
        setEditingId(plan.id);
        setData({
            name: plan.name,
            price: plan.price,
            duration_months: plan.duration_months?.toString() || '',
            sessions_total: plan.sessions_total?.toString() || '',
            sessions_per_week: plan.sessions_per_week?.toString() || '',
            description: plan.description || '',
            category: plan.category || 'fisioterapia',
        });
        clearErrors();
        setSheetOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const options = {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setSheetOpen(false);
                reset();
            },
        };

        if (isEditing && editingId) {
            put(`/commercial-plans/${editingId}`, options);
        } else {
            post('/commercial-plans', options);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Planos Comerciais - Phisio" />
            {modal}

            <div className="mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-6 p-6 md:p-10">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            Planos e Pacotes
                        </h1>
                        <p className="mt-1 text-muted-foreground">
                            Gerencie os pacotes comerciais disponíveis para
                            matrículas.
                        </p>
                    </div>
                    {can('commercial_plans.manage.create') && (
                        <button
                            onClick={openCreateSheet}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90"
                        >
                            <Plus className="size-4" />
                            Novo Plano
                        </button>
                    )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 shadow-sm backdrop-blur-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-border/50 bg-muted/50 text-xs text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-6 py-4 font-medium">
                                        Nome do Plano
                                    </th>
                                    <th className="px-6 py-4 font-medium">
                                        Valor Base
                                    </th>
                                    <th className="hidden px-6 py-4 font-medium sm:table-cell">
                                        Duração Padrão
                                    </th>
                                    <th className="hidden px-6 py-4 font-medium sm:table-cell">
                                        Sessões
                                    </th>
                                    <th className="px-6 py-4 text-right font-medium">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {plans.map((plan) => (
                                    <tr
                                        key={plan.id}
                                        className="group transition-colors hover:bg-muted/30"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                                                    <Tag className="size-4" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 font-medium text-foreground">
                                                        {plan.name}
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                plan.category ===
                                                                'fisioterapia'
                                                                    ? 'border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                                    : plan.category ===
                                                                        'pilates'
                                                                      ? 'border-purple-200 bg-purple-100 text-purple-700 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                                                      : plan.category ===
                                                                          'teste'
                                                                        ? 'border-orange-200 bg-orange-100 text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                                                                        : ''
                                                            }
                                                        >
                                                            {plan.category ===
                                                            'fisioterapia'
                                                                ? 'Fisioterapia'
                                                                : plan.category ===
                                                                    'pilates'
                                                                  ? 'Pilates'
                                                                  : plan.category ===
                                                                      'teste'
                                                                    ? 'Aula Teste'
                                                                    : plan.category}
                                                        </Badge>
                                                    </div>
                                                    {plan.description && (
                                                        <div className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">
                                                            {plan.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-emerald-600 dark:text-emerald-400">
                                            R${' '}
                                            {parseFloat(plan.price)
                                                .toFixed(2)
                                                .replace('.', ',')}
                                        </td>
                                        <td className="hidden px-6 py-4 text-muted-foreground sm:table-cell">
                                            {plan.duration_months
                                                ? `${plan.duration_months} ${plan.duration_months === 1 ? 'mês' : 'meses'}`
                                                : 'Não definida'}
                                        </td>
                                        <td className="hidden px-6 py-4 text-muted-foreground sm:table-cell">
                                            {plan.sessions_per_week
                                                ? `${plan.sessions_per_week}x/semana (${plan.sessions_per_week * 4}/mês)`
                                                : plan.sessions_total
                                                  ? `${plan.sessions_total} sessões`
                                                  : 'Ilimitado'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {can(
                                                    'commercial_plans.manage.edit',
                                                ) && (
                                                    <button
                                                        onClick={() =>
                                                            openEditSheet(plan)
                                                        }
                                                        className="rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                                                        title="Editar"
                                                    >
                                                        <Edit className="size-4" />
                                                    </button>
                                                )}
                                                {can(
                                                    'commercial_plans.manage.delete',
                                                ) && (
                                                    <button
                                                        onClick={() =>
                                                            handleDelete(plan)
                                                        }
                                                        className="rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {plans.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-6 py-12 text-center text-muted-foreground"
                                        >
                                            Nenhum plano comercial cadastrado.
                                            Clique em "Novo Plano" para começar.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent
                    side="right"
                    className="w-full overflow-y-auto sm:max-w-md"
                >
                    <SheetHeader>
                        <SheetTitle>
                            {isEditing
                                ? 'Editar Plano Comercial'
                                : 'Novo Plano Comercial'}
                        </SheetTitle>
                    </SheetHeader>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nome do Plano *</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                placeholder="Ex: Pilates Mensal 2x Semana"
                                className="bg-background"
                                required
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="category">Categoria *</Label>
                            <Select
                                value={data.category}
                                onValueChange={(value) =>
                                    setData('category', value)
                                }
                            >
                                <SelectTrigger
                                    className="bg-background"
                                    id="category"
                                >
                                    <SelectValue placeholder="Selecione a categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fisioterapia">
                                        Fisioterapia
                                    </SelectItem>
                                    <SelectItem value="pilates">
                                        Pilates
                                    </SelectItem>
                                    <SelectItem value="teste">
                                        Aula Teste
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError message={errors.category} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="price">Valor Base (R$) *</Label>
                            <Input
                                id="price"
                                type="number"
                                step="0.01"
                                min="0"
                                value={data.price}
                                onChange={(e) =>
                                    setData('price', e.target.value)
                                }
                                placeholder="0.00"
                                className="bg-background"
                                required
                            />
                            <InputError message={errors.price} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="duration_months">
                                Duração Padrão (Meses)
                            </Label>
                            <Input
                                id="duration_months"
                                type="number"
                                min="1"
                                value={data.duration_months}
                                onChange={(e) =>
                                    setData('duration_months', e.target.value)
                                }
                                placeholder="Ex: 1 para mensal, 3 para trimestral"
                                className="bg-background"
                            />
                            <InputError message={errors.duration_months} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="sessions_total">
                                Sessões Incluídas
                            </Label>
                            <Input
                                id="sessions_total"
                                type="number"
                                min="1"
                                value={data.sessions_total}
                                onChange={(e) =>
                                    setData('sessions_total', e.target.value)
                                }
                                placeholder="Deixe em branco para ilimitado"
                                className="bg-background"
                            />
                            <p className="text-xs text-muted-foreground">
                                Total de sessões/aulas que o aluno pode usar
                                durante a vigência. Em branco = ilimitado.
                            </p>
                            <InputError message={errors.sessions_total} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="sessions_per_week">
                                Aulas por Semana
                            </Label>
                            <Input
                                id="sessions_per_week"
                                type="number"
                                min="1"
                                max="7"
                                value={data.sessions_per_week}
                                onChange={(e) =>
                                    setData('sessions_per_week', e.target.value)
                                }
                                placeholder="Ex: 2 para 2x na semana"
                                className="bg-background"
                            />
                            <p className="text-xs text-muted-foreground">
                                Frequência semanal. Usada para calcular a cota
                                mensal de aulas (aulas/semana × 4). Em branco =
                                sem cota.
                            </p>
                            <InputError message={errors.sessions_per_week} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">
                                Descrição / Regras
                            </Label>
                            <textarea
                                id="description"
                                value={data.description}
                                onChange={(e) =>
                                    setData('description', e.target.value)
                                }
                                placeholder="Detalhes sobre o que está incluso..."
                                className="flex min-h-[100px] w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                            />
                            <InputError message={errors.description} />
                        </div>

                        <div className="flex items-center justify-end gap-4 border-t border-border/30 pt-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setSheetOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={processing}
                                className="rounded-xl bg-primary px-6 py-2.5 text-white shadow-sm hover:bg-primary/90"
                            >
                                {processing
                                    ? 'Salvando...'
                                    : isEditing
                                      ? 'Salvar Alterações'
                                      : 'Salvar Plano'}
                            </Button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
        </AppLayout>
    );
}
