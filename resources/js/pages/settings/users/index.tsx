import { Head, useForm, router } from '@inertiajs/react';
import { Plus, Edit, Trash2, Shield, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { useConfirmModal } from '@/components/confirm-modal';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Configurações', href: '/settings/users' },
    { title: 'Usuários', href: '/settings/users' },
];

export default function UsersIndex({
    users,
    roles,
}: {
    users: any;
    roles: any[];
}) {
    const { confirm, modal } = useConfirmModal();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm({
            name: '',
            email: '',
            password: '',
            role: '',
        });

    function openCreate() {
        setEditingUser(null);
        reset();
        clearErrors();
        setIsModalOpen(true);
    }

    function openEdit(user: any) {
        setEditingUser(user);
        setData({
            name: user.name,
            email: user.email,
            password: '',
            role: user.roles?.[0]?.name || '',
        });
        clearErrors();
        setIsModalOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (editingUser) {
            put(`/settings/users/${editingUser.id}`, {
                onSuccess: () => setIsModalOpen(false),
            });
        } else {
            post('/settings/users', {
                onSuccess: () => setIsModalOpen(false),
            });
        }
    }

    async function handleDelete(user: any) {
        const confirmed = await confirm({
            title: 'Excluir Usuário',
            message: `Tem certeza que deseja excluir o usuário "${user.name}"?`,
            confirmLabel: 'Excluir',
        });
        if (confirmed) {
            router.delete(`/settings/users/${user.id}`);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Usuários - Configurações" />

            <div className="mx-auto flex h-full w-full max-w-6xl flex-1 flex-col gap-6 p-6 md:p-10">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            Usuários
                        </h1>
                        <p className="mt-1 text-muted-foreground">
                            Gerencie os usuários e seus perfis de acesso.
                        </p>
                    </div>
                    <button
                        onClick={openCreate}
                        className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                    >
                        <Plus className="size-4" />
                        <span>Novo Usuário</span>
                    </button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 shadow-sm backdrop-blur-xl">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-border/50 bg-muted/50 text-xs text-muted-foreground uppercase">
                            <tr>
                                <th className="px-5 py-3.5 font-semibold">
                                    Nome
                                </th>
                                <th className="px-5 py-3.5 font-semibold">
                                    Email
                                </th>
                                <th className="px-5 py-3.5 font-semibold">
                                    Perfil (Role)
                                </th>
                                <th className="w-24 px-5 py-3.5 text-center">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {users.data.map((user: any) => (
                                <tr
                                    key={user.id}
                                    className="group transition-colors hover:bg-muted/30"
                                >
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                <UserIcon className="size-4" />
                                            </div>
                                            <span className="font-medium text-foreground">
                                                {user.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-muted-foreground">
                                        {user.email}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        {user.roles && user.roles.length > 0 ? (
                                            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                <Shield className="size-3" />
                                                {user.roles[0].name}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">
                                                Sem Perfil
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => openEdit(user)}
                                                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                                                title="Editar"
                                            >
                                                <Edit className="size-4" />
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleDelete(user)
                                                }
                                                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                                                title="Excluir"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {users.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-5 py-8 text-center text-muted-foreground"
                                    >
                                        Nenhum usuário encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md animate-in overflow-hidden rounded-2xl bg-card shadow-xl duration-200 zoom-in-95 fade-in">
                        <div className="border-b border-border/50 px-6 py-4">
                            <h2 className="text-lg font-semibold">
                                {editingUser
                                    ? 'Editar Usuário'
                                    : 'Novo Usuário'}
                            </h2>
                        </div>
                        <form onSubmit={submit} className="space-y-4 p-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Nome
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

                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={data.email}
                                    onChange={(e) =>
                                        setData('email', e.target.value)
                                    }
                                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                    required
                                />
                                {errors.email && (
                                    <p className="text-xs text-red-500">
                                        {errors.email}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Senha{' '}
                                    {editingUser && (
                                        <span className="text-xs font-normal text-muted-foreground">
                                            (Deixe em branco para manter)
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="password"
                                    value={data.password}
                                    onChange={(e) =>
                                        setData('password', e.target.value)
                                    }
                                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                    required={!editingUser}
                                />
                                {errors.password && (
                                    <p className="text-xs text-red-500">
                                        {errors.password}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Perfil de Acesso
                                </label>
                                <select
                                    value={data.role}
                                    onChange={(e) =>
                                        setData('role', e.target.value)
                                    }
                                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                    required
                                >
                                    <option value="">
                                        Selecione um perfil...
                                    </option>
                                    {roles.map((r) => (
                                        <option key={r.id} value={r.name}>
                                            {r.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.role && (
                                    <p className="text-xs text-red-500">
                                        {errors.role}
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
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
                                    Salvar
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
