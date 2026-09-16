import { Head, useForm, router } from '@inertiajs/react';
import { Plus, Edit, Trash2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useConfirmModal } from '@/components/confirm-modal';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Configurações', href: '/settings/users' },
    { title: 'Perfis de Acesso', href: '/settings/roles' },
];

// Translations for module group names
const moduleLabels: Record<string, string> = {
    dashboard: 'Painel Inicial',
    patients: 'Pacientes',
    appointments: 'Agenda',
    group_classes: 'Turmas',
    evolutions: 'Evoluções',
    treatment_plans: 'Protocolos Clínicos',
    memberships: 'Matrículas',
    commercial_plans: 'Planos Comerciais',
    financial: 'Financeiro',
    recurring_expenses: 'Gastos Recorrentes',
    reports: 'Relatórios',
    calendar: 'Sincronização de Agenda',
    settings: 'Configurações',
};

// Translations for individual permission names
const permissionLabels: Record<string, string> = {
    'dashboard.view': 'Visualizar Painel',

    'patients.manage.view': 'Visualizar Pacientes',
    'patients.manage.create': 'Cadastrar Pacientes',
    'patients.manage.edit': 'Editar Pacientes',
    'patients.manage.delete': 'Excluir Pacientes',

    'appointments.manage.view': 'Visualizar Agenda',
    'appointments.manage.create': 'Criar Agendamentos',
    'appointments.manage.edit': 'Editar Agendamentos',
    'appointments.manage.delete': 'Excluir Agendamentos',

    'group_classes.manage.view': 'Visualizar Turmas',
    'group_classes.manage.create': 'Criar Turmas',
    'group_classes.manage.edit': 'Editar Turmas',
    'group_classes.manage.delete': 'Excluir Turmas',

    'evolutions.manage.view': 'Visualizar Evoluções',
    'evolutions.manage.create': 'Registrar Evoluções',
    'evolutions.manage.edit': 'Editar Evoluções',
    'evolutions.manage.delete': 'Excluir Evoluções',

    'treatment_plans.manage.view': 'Visualizar Protocolos',
    'treatment_plans.manage.create': 'Criar Protocolos',
    'treatment_plans.manage.edit': 'Editar Protocolos',
    'treatment_plans.manage.delete': 'Excluir Protocolos',

    'memberships.manage.view': 'Visualizar Matrículas',
    'memberships.manage.create': 'Criar Matrículas',
    'memberships.manage.edit': 'Editar Matrículas',
    'memberships.manage.delete': 'Excluir Matrículas',

    'commercial_plans.manage.view': 'Visualizar Planos',
    'commercial_plans.manage.create': 'Criar Planos',
    'commercial_plans.manage.edit': 'Editar Planos',
    'commercial_plans.manage.delete': 'Excluir Planos',

    'financial.transactions.view': 'Visualizar Transações',
    'financial.transactions.create': 'Registrar Transações',
    'financial.transactions.edit': 'Editar Transações',
    'financial.transactions.delete': 'Excluir Transações',

    'recurring_expenses.manage.view': 'Visualizar Gastos Recorrentes',
    'recurring_expenses.manage.create': 'Registrar Gastos Recorrentes',
    'recurring_expenses.manage.edit': 'Editar Gastos Recorrentes',
    'recurring_expenses.manage.delete': 'Excluir Gastos Recorrentes',

    'reports.manage.view': 'Visualizar Relatórios',

    'calendar.sync.manage': 'Gerenciar Sincronização',

    'settings.users.view': 'Visualizar Usuários',
    'settings.users.create': 'Cadastrar Usuários',
    'settings.users.edit': 'Editar Usuários',
    'settings.users.delete': 'Excluir Usuários',
    'settings.roles.view': 'Visualizar Perfis de Acesso',
    'settings.roles.create': 'Criar Perfis de Acesso',
    'settings.roles.edit': 'Editar Perfis de Acesso',
    'settings.roles.delete': 'Excluir Perfis de Acesso',
};

function getModuleLabel(key: string): string {
    return moduleLabels[key] || key.replace(/_/g, ' ');
}

function getPermissionLabel(name: string): string {
    return permissionLabels[name] || name.split('.').slice(1).join(' ');
}

export default function RolesIndex({
    roles,
    groupedPermissions,
}: {
    roles: any[];
    groupedPermissions: any;
}) {
    const { confirm, modal } = useConfirmModal();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<any>(null);

    const { data, setData, post, put, processing, errors, clearErrors } =
        useForm({
            name: '',
            permissions: [] as string[],
        });

    function openCreate() {
        setEditingRole(null);
        setData({
            name: '',
            permissions: [],
        });
        clearErrors();
        setIsModalOpen(true);
    }

    function openEdit(role: any) {
        setEditingRole(role);
        setData({
            name: role.name,
            permissions: role.permissions
                ? role.permissions.map((p: any) => p.name)
                : [],
        });
        clearErrors();
        setIsModalOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (editingRole) {
            put(`/settings/roles/${editingRole.id}`, {
                onSuccess: () => setIsModalOpen(false),
            });
        } else {
            post('/settings/roles', {
                onSuccess: () => setIsModalOpen(false),
            });
        }
    }

    async function handleDelete(role: any) {
        const confirmed = await confirm({
            title: 'Excluir Perfil',
            message: `Tem certeza que deseja excluir o perfil "${role.name}"? Isso afetará os usuários vinculados.`,
            confirmLabel: 'Excluir',
        });
        if (confirmed) {
            router.delete(`/settings/roles/${role.id}`);
        }
    }

    function togglePermission(permissionName: string) {
        if (data.permissions.includes(permissionName)) {
            setData(
                'permissions',
                data.permissions.filter((p) => p !== permissionName),
            );
        } else {
            setData('permissions', [...data.permissions, permissionName]);
        }
    }

    function toggleModule(modulePerms: any[]) {
        const allNames = modulePerms.map((p: any) => p.name);
        const allSelected = allNames.every((n) => data.permissions.includes(n));
        if (allSelected) {
            setData(
                'permissions',
                data.permissions.filter((p) => !allNames.includes(p)),
            );
        } else {
            const merged = [...new Set([...data.permissions, ...allNames])];
            setData('permissions', merged);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Perfis de Acesso - Configurações" />

            <div className="mx-auto flex h-full w-full max-w-6xl flex-1 flex-col gap-6 p-6 md:p-10">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            Perfis de Acesso
                        </h1>
                        <p className="mt-1 text-muted-foreground">
                            Gerencie os perfis e as permissões de cada módulo.
                        </p>
                    </div>
                    <button
                        onClick={openCreate}
                        className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                    >
                        <Plus className="size-4" />
                        <span>Novo Perfil</span>
                    </button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 shadow-sm backdrop-blur-xl">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-border/50 bg-muted/50 text-xs text-muted-foreground uppercase">
                            <tr>
                                <th className="px-5 py-3.5 font-semibold">
                                    Nome do Perfil
                                </th>
                                <th className="px-5 py-3.5 font-semibold">
                                    Permissões Habilitadas
                                </th>
                                <th className="w-24 px-5 py-3.5 text-center">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {roles.map((role: any) => (
                                <tr
                                    key={role.id}
                                    className="group transition-colors hover:bg-muted/30"
                                >
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                <ShieldCheck className="size-4" />
                                            </div>
                                            <span className="font-medium text-foreground">
                                                {role.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-muted-foreground">
                                        {role.name === 'Administrador' ? (
                                            <span className="font-medium text-emerald-600">
                                                Acesso Total
                                            </span>
                                        ) : (
                                            <span>
                                                {role.permissions?.length || 0}{' '}
                                                permissões
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            {role.name !== 'Administrador' && (
                                                <>
                                                    <button
                                                        onClick={() =>
                                                            openEdit(role)
                                                        }
                                                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                                                        title="Editar"
                                                    >
                                                        <Edit className="size-4" />
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            handleDelete(role)
                                                        }
                                                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
                    <div className="my-8 w-full max-w-4xl animate-in overflow-hidden rounded-2xl bg-card shadow-xl duration-200 zoom-in-95 fade-in">
                        <div className="border-b border-border/50 px-6 py-4">
                            <h2 className="text-xl font-semibold">
                                {editingRole ? 'Editar Perfil' : 'Novo Perfil'}
                            </h2>
                        </div>
                        <form onSubmit={submit} className="space-y-6 p-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Nome do Perfil
                                </label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) =>
                                        setData('name', e.target.value)
                                    }
                                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                    required
                                />
                                {errors.name && (
                                    <p className="text-xs text-red-500">
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-4">
                                <h3 className="border-b border-border/50 pb-2 text-sm font-medium">
                                    Permissões de Acesso
                                </h3>

                                <div className="grid max-h-[50vh] grid-cols-1 gap-6 overflow-y-auto p-1 md:grid-cols-2 lg:grid-cols-3">
                                    {Object.entries(groupedPermissions).map(
                                        ([module, perms]: [string, any]) => {
                                            const allNames = perms.map(
                                                (p: any) => p.name,
                                            );
                                            const allSelected = allNames.every(
                                                (n: string) =>
                                                    data.permissions.includes(
                                                        n,
                                                    ),
                                            );
                                            const someSelected = allNames.some(
                                                (n: string) =>
                                                    data.permissions.includes(
                                                        n,
                                                    ),
                                            );

                                            return (
                                                <div
                                                    key={module}
                                                    className="rounded-xl border border-border/50 bg-muted/30 p-4"
                                                >
                                                    <div className="mb-3 flex items-center justify-between">
                                                        <h4 className="text-sm font-semibold text-primary">
                                                            {getModuleLabel(
                                                                module,
                                                            )}
                                                        </h4>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                toggleModule(
                                                                    perms,
                                                                )
                                                            }
                                                            className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                                                                allSelected
                                                                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                                                                    : someSelected
                                                                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
                                                                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                            }`}
                                                        >
                                                            {allSelected
                                                                ? 'Desmarcar todos'
                                                                : 'Marcar todos'}
                                                        </button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {perms.map((p: any) => (
                                                            <label
                                                                key={p.name}
                                                                className="group flex cursor-pointer items-center gap-2"
                                                            >
                                                                <div className="relative flex items-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="peer sr-only"
                                                                        checked={data.permissions.includes(
                                                                            p.name,
                                                                        )}
                                                                        onChange={() =>
                                                                            togglePermission(
                                                                                p.name,
                                                                            )
                                                                        }
                                                                    />
                                                                    <div className="flex h-4 w-4 items-center justify-center rounded border border-border bg-background transition-colors peer-checked:border-primary peer-checked:bg-primary">
                                                                        {data.permissions.includes(
                                                                            p.name,
                                                                        ) && (
                                                                            <svg
                                                                                className="h-3 w-3 text-primary-foreground"
                                                                                fill="none"
                                                                                viewBox="0 0 24 24"
                                                                                stroke="currentColor"
                                                                                strokeWidth={
                                                                                    3
                                                                                }
                                                                            >
                                                                                <path
                                                                                    strokeLinecap="round"
                                                                                    strokeLinejoin="round"
                                                                                    d="M5 13l4 4L19 7"
                                                                                />
                                                                            </svg>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <span className="text-sm text-foreground transition-colors group-hover:text-primary">
                                                                    {getPermissionLabel(
                                                                        p.name,
                                                                    )}
                                                                </span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        },
                                    )}
                                </div>
                                {errors.permissions && (
                                    <p className="text-xs text-red-500">
                                        {errors.permissions}
                                    </p>
                                )}
                            </div>

                            <div className="mt-6 flex justify-end gap-3 border-t border-border/50 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                                >
                                    Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modal}
        </AppLayout>
    );
}
