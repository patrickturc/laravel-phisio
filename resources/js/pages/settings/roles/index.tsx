import { Head, useForm, router } from '@inertiajs/react';
import { AlertTriangle, Plus, Edit, Trash2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useConfirmModal } from '@/components/confirm-modal';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Configurações', href: '/settings/users' },
    { title: 'Perfis de Acesso', href: '/settings/roles' },
];

interface PermissionText {
    label: string;
    description: string;
    /** Shown in amber: sensitive data or an action that is hard to undo. */
    warning?: string;
}

// Module group names, with what the module covers and who usually needs it.
const moduleLabels: Record<string, { label: string; description: string }> = {
    dashboard: {
        label: 'Painel Inicial',
        description: 'Primeira tela depois do login, com o resumo do dia.',
    },
    patients: {
        label: 'Pacientes',
        description:
            'Cadastro e ficha de cada paciente. Quase toda a equipe precisa ver.',
    },
    appointments: {
        label: 'Agenda',
        description:
            'Aulas, sessões e horários fixos de todos os profissionais.',
    },
    group_classes: {
        label: 'Turmas',
        description: 'Turmas com dia, horário e alunos fixos.',
    },
    evolutions: {
        label: 'Prontuário',
        description:
            'Evoluções clínicas de cada atendimento. Normalmente só para fisioterapeutas e instrutores.',
    },
    treatment_plans: {
        label: 'Protocolos Clínicos',
        description: 'Modelos de tratamento usados ao registrar evoluções.',
    },
    memberships: {
        label: 'Matrículas',
        description:
            'O plano que cada paciente contratou, com valor, vigência e sessões.',
    },
    commercial_plans: {
        label: 'Planos e Pacotes',
        description: 'A tabela de planos e preços que a clínica vende.',
    },
    financial: {
        label: 'Financeiro',
        description:
            'Dinheiro que entra e sai: mensalidades, cobranças e despesas.',
    },
    recurring_expenses: {
        label: 'Gastos Recorrentes',
        description:
            'Despesas fixas, como aluguel e internet, lançadas automaticamente.',
    },
    reports: {
        label: 'Relatórios',
        description: 'Números de pacientes e atendimentos por período.',
    },
    calendar: {
        label: 'Agenda no Celular',
        description:
            'Levar os próprios atendimentos para o Google Agenda, Apple ou Outlook.',
    },
    professional: {
        label: 'Atendimento',
        description: 'Define quem atende pacientes na clínica.',
    },
    settings: {
        label: 'Configurações',
        description:
            'Dados da clínica e controle de quem acessa o sistema. Normalmente só para o dono ou gestor.',
    },
};

// What each permission lets a person see or do, in plain language.
const permissionLabels: Record<string, PermissionText> = {
    'dashboard.view': {
        label: 'Ver o painel inicial',
        description:
            'Vê a agenda do dia, os aniversariantes dos próximos 7 dias, as evoluções pendentes e os números do mês.',
        warning: 'Os números do mês incluem o faturamento da clínica.',
    },

    'patients.manage.view': {
        label: 'Ver pacientes',
        description:
            'Vê a lista de pacientes e abre a ficha: dados pessoais, contato, agendamentos e documentos. Também acessa a tela de aniversariantes.',
        warning:
            'A ficha mostra CPF, endereço e as observações de saúde do paciente.',
    },
    'patients.manage.create': {
        label: 'Cadastrar pacientes',
        description: 'Inclui novos pacientes no sistema.',
    },
    'patients.manage.edit': {
        label: 'Editar pacientes',
        description:
            'Altera os dados da ficha, envia e apaga documentos (exames, laudos) e muda o texto das mensagens de aniversário e de lembrete de aula.',
    },
    'patients.manage.delete': {
        label: 'Excluir pacientes',
        description:
            'Tira o paciente da lista. O histórico de atendimentos e cobranças é mantido.',
    },

    'appointments.manage.view': {
        label: 'Ver a agenda',
        description:
            'Vê a agenda de todos os profissionais, os detalhes de cada aula e a lista de lembretes para enviar por WhatsApp.',
    },
    'appointments.manage.create': {
        label: 'Agendar',
        description:
            'Marca aulas e sessões avulsas e cria horários fixos (o mesmo horário toda semana).',
    },
    'appointments.manage.edit': {
        label: 'Alterar agendamentos',
        description:
            'Reagenda, faz check-in, marca falta e registra que o paciente confirmou ou recebeu o lembrete.',
    },
    'appointments.manage.delete': {
        label: 'Excluir agendamentos',
        description:
            'Cancela ou apaga aulas e encerra horários fixos, tirando as aulas futuras da agenda.',
    },
    'appointments.settings.manage': {
        label: 'Configurar a agenda',
        description:
            'Define o horário de funcionamento, os intervalos, quantos alunos cabem por horário, as salas e a cor e os dias de atendimento de cada profissional.',
    },

    'group_classes.manage.view': {
        label: 'Ver turmas',
        description: 'Vê as turmas, seus horários, alunos e faltas.',
    },
    'group_classes.manage.create': {
        label: 'Criar turmas',
        description: 'Monta novas turmas com dia, horário e alunos.',
    },
    'group_classes.manage.edit': {
        label: 'Alterar turmas',
        description:
            'Troca alunos, horários e o profissional da turma e gera as aulas das próximas semanas.',
    },
    'group_classes.manage.delete': {
        label: 'Excluir turmas',
        description: 'Tira a turma da lista de turmas.',
    },

    'evolutions.manage.view': {
        label: 'Ver o prontuário',
        description:
            'Lê as evoluções de todos os pacientes, inclusive na aba Prontuário da ficha, e gera o PDF.',
        warning:
            'É dado de saúde, protegido pela LGPD. Libere só para a equipe clínica.',
    },
    'evolutions.manage.create': {
        label: 'Registrar evoluções',
        description: 'Escreve a evolução de um atendimento.',
    },
    'evolutions.manage.edit': {
        label: 'Alterar evoluções',
        description: 'Corrige evoluções que já foram registradas.',
        warning: 'Vale também para as evoluções de outros profissionais.',
    },
    'evolutions.manage.delete': {
        label: 'Excluir evoluções',
        description: 'Apaga evoluções do prontuário.',
    },

    'treatment_plans.manage.view': {
        label: 'Ver protocolos',
        description:
            'Vê os protocolos clínicos e pode escolher um ao registrar a evolução.',
    },
    'treatment_plans.manage.create': {
        label: 'Criar protocolos',
        description: 'Cadastra novos protocolos de tratamento.',
    },
    'treatment_plans.manage.edit': {
        label: 'Alterar protocolos',
        description: 'Muda o nome, a descrição e o número de sessões.',
    },
    'treatment_plans.manage.delete': {
        label: 'Excluir protocolos',
        description: 'Apaga protocolos.',
    },

    'memberships.manage.view': {
        label: 'Ver matrículas',
        description:
            'Vê a matrícula de cada paciente: plano, valor, vigência e sessões usadas no mês. Também a aba Matrículas da ficha.',
    },
    'memberships.manage.create': {
        label: 'Matricular',
        description: 'Matricula pacientes em um plano e renova matrículas.',
        warning:
            'As cobranças do plano são criadas automaticamente, mesmo sem permissão no Financeiro.',
    },
    'memberships.manage.edit': {
        label: 'Alterar matrículas',
        description:
            'Muda plano, valor e datas e pausa ou retoma a matrícula (por férias ou lesão, por exemplo).',
    },
    'memberships.manage.delete': {
        label: 'Excluir matrículas',
        description: 'Apaga a matrícula.',
        warning:
            'As cobranças ainda não pagas dessa matrícula são apagadas junto.',
    },

    'commercial_plans.manage.view': {
        label: 'Ver planos e pacotes',
        description: 'Vê os planos à venda e seus preços.',
    },
    'commercial_plans.manage.create': {
        label: 'Criar planos',
        description: 'Cadastra novos planos e pacotes.',
    },
    'commercial_plans.manage.edit': {
        label: 'Alterar planos',
        description:
            'Muda preço, duração, número de sessões e de quanto em quanto tempo o plano é cobrado. Vale para as próximas matrículas.',
    },
    'commercial_plans.manage.delete': {
        label: 'Excluir planos',
        description: 'Tira o plano da tabela de preços.',
    },

    'financial.transactions.view': {
        label: 'Ver o financeiro',
        description:
            'Vê receitas, despesas, contas a receber, ganhos por profissional e a aba Financeiro da ficha. Também emite recibos e mostra o PIX das cobranças.',
    },
    'financial.transactions.create': {
        label: 'Lançar no financeiro',
        description: 'Registra novas receitas e despesas avulsas.',
    },
    'financial.transactions.edit': {
        label: 'Dar baixa e cobrar',
        description:
            'Confirma pagamentos, marca cobranças como perda ou em análise, envia lembretes de cobrança por WhatsApp e muda o texto dessas mensagens.',
    },
    'financial.transactions.delete': {
        label: 'Excluir lançamentos',
        description:
            'Apaga receitas e despesas. A exclusão fica registrada no histórico.',
    },

    'recurring_expenses.manage.view': {
        label: 'Ver gastos recorrentes',
        description: 'Vê as despesas fixas cadastradas.',
    },
    'recurring_expenses.manage.create': {
        label: 'Cadastrar gastos recorrentes',
        description:
            'Inclui despesas que se repetem (mensal, trimestral ou anual).',
    },
    'recurring_expenses.manage.edit': {
        label: 'Alterar gastos recorrentes',
        description:
            'Muda valor, dia de vencimento e frequência, e ativa ou pausa o lançamento.',
    },
    'recurring_expenses.manage.delete': {
        label: 'Excluir gastos recorrentes',
        description:
            'Para de lançar a despesa. Os lançamentos já feitos continuam no financeiro.',
    },

    'reports.manage.view': {
        label: 'Ver relatórios',
        description:
            'Vê quantos pacientes foram atendidos, sessões realizadas e canceladas, evoluções por mês e os pacientes mais frequentes, e exporta em PDF.',
    },

    'calendar.sync.manage': {
        label: 'Sincronizar a própria agenda',
        description:
            'Gera um link que leva os próprios atendimentos para o Google Agenda, Apple ou Outlook do celular.',
        warning:
            'Os eventos mostram o nome dos pacientes no aplicativo de calendário.',
    },

    'professional.attend': {
        label: 'Atende pacientes',
        description:
            'Marca a pessoa como profissional: ela aparece para ser escolhida ao agendar e montar turmas, ganha uma cor na agenda e entra nos ganhos por profissional.',
    },

    'settings.organization.manage': {
        label: 'Gerenciar a clínica',
        description:
            'Altera os dados, o endereço e o logo da clínica e contrata ou troca o plano do sistema.',
        warning:
            'Inclui a chave PIX que recebe todas as cobranças. Libere só para quem cuida do negócio.',
    },
    'settings.users.view': {
        label: 'Ver usuários',
        description: 'Vê quem tem acesso ao sistema e com qual perfil.',
    },
    'settings.users.create': {
        label: 'Cadastrar usuários',
        description:
            'Dá acesso a novas pessoas, escolhendo o perfil de cada uma.',
        warning:
            'Quem não é administrador só pode escolher perfis com permissões que ele mesmo tem.',
    },
    'settings.users.edit': {
        label: 'Alterar usuários',
        description: 'Muda nome, e-mail, senha e perfil de outros usuários.',
        warning:
            'Quem troca a senha de alguém consegue entrar como essa pessoa. Por isso só vale para usuários sem permissões além das suas.',
    },
    'settings.users.delete': {
        label: 'Excluir usuários',
        description:
            'Remove o acesso de uma pessoa, desde que ela não tenha permissões além das suas.',
    },
    'settings.roles.view': {
        label: 'Ver perfis de acesso',
        description:
            'Vê os perfis (como Recepcionista) e o que cada um libera.',
    },
    'settings.roles.create': {
        label: 'Criar perfis de acesso',
        description:
            'Monta novos perfis, usando só permissões que a própria pessoa tem.',
    },
    'settings.roles.edit': {
        label: 'Alterar perfis de acesso',
        description:
            'Muda o nome e as permissões de um perfil, dentro das permissões que a própria pessoa tem. Vale na hora para todos com esse perfil.',
    },
    'settings.roles.delete': {
        label: 'Excluir perfis de acesso',
        description: 'Apaga perfis que não estão em uso por nenhum usuário.',
    },
};

/**
 * What a permission allows, with a highlighted warning when it exposes
 * sensitive data or is hard to undo.
 */
function PermissionDescription({ name }: { name: string }) {
    const text = permissionLabels[name];

    if (!text) {
        return null;
    }

    return (
        <>
            <span className="block text-xs leading-snug text-muted-foreground">
                {text.description}
            </span>
            {text.warning && (
                <span className="mt-1 flex items-start gap-1 text-xs leading-snug text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="mt-px size-3 flex-shrink-0" />
                    {text.warning}
                </span>
            )}
        </>
    );
}

function getModuleLabel(key: string): string {
    return moduleLabels[key]?.label || key.replace(/_/g, ' ');
}

function getPermissionLabel(name: string): string {
    return permissionLabels[name]?.label || name.split('.').slice(1).join(' ');
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
                                <div className="border-b border-border/50 pb-2">
                                    <h3 className="text-sm font-medium">
                                        Permissões de Acesso
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Marque o que as pessoas com este perfil
                                        podem ver e fazer. Para cadastrar,
                                        alterar ou excluir, marque também o
                                        “Ver” do mesmo módulo: sem ele a pessoa
                                        não chega à tela. Os avisos em amarelo
                                        indicam dados sensíveis ou ações
                                        difíceis de desfazer.
                                    </p>
                                </div>

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
                                                    <div className="mb-3 flex items-start justify-between gap-2">
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-primary">
                                                                {getModuleLabel(
                                                                    module,
                                                                )}
                                                            </h4>
                                                            {moduleLabels[
                                                                module
                                                            ] && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    {
                                                                        moduleLabels[
                                                                            module
                                                                        ]
                                                                            .description
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
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
                                                    <div className="space-y-3">
                                                        {perms.map((p: any) => (
                                                            <label
                                                                key={p.name}
                                                                className="group flex cursor-pointer items-start gap-2"
                                                            >
                                                                <div className="relative mt-0.5 flex items-center">
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
                                                                <span className="min-w-0">
                                                                    <span className="block text-sm text-foreground transition-colors group-hover:text-primary">
                                                                        {getPermissionLabel(
                                                                            p.name,
                                                                        )}
                                                                    </span>
                                                                    <PermissionDescription
                                                                        name={
                                                                            p.name
                                                                        }
                                                                    />
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
