import DevAdminLayout from '@/layouts/DevAdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Building,
    Users,
    Activity,
    LogIn,
    Calendar,
    FileText,
    HeartPulse,
    ShieldAlert,
    KeyRound,
    UserPlus,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Download,
    PackageCheck
} from 'lucide-react';
import { useState } from 'react';

import { TenantFormSheet } from './TenantFormSheet';
import { TenantStatusBadge } from './TenantStatusBadge';

interface PlanOption {
    name: string;
    users: number;
    storage_mb: number;
    selectable: boolean;
}

interface ShowProps {
    plans: Record<string, PlanOption>;
    extraUserPrice: number;
    tenant: any;
    metrics: {
        total_patients: number;
        appointments_this_month: number;
        total_evolutions: number;
        last_activity_text: string;
        health_status: 'active' | 'attention' | 'risk';
        days_inactive: number | null;
    };
    usageLogs: any[];
}

export default function Show({ tenant, metrics, usageLogs, plans, extraUserPrice }: ShowProps) {
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
    const [resetPasswordUser, setResetPasswordUser] = useState<any | null>(null);

    const userForm = useForm({
        name: '',
        email: '',
        password: '',
        role: 'admin',
    });

    const passwordForm = useForm({
        password: '',
    });

    const handleImpersonate = () => {
        if (confirm(`Deseja acessar o sistema como administrador da clínica "${tenant.name}"?`)) {
            router.post(`/dev-admin/tenants/${tenant.id}/impersonate`);
        }
    };

    const handleCreateUser = (e: React.FormEvent) => {
        e.preventDefault();
        userForm.post(`/dev-admin/tenants/${tenant.id}/users`, {
            onSuccess: () => {
                setIsAddUserOpen(false);
                userForm.reset();
            },
        });
    };

    const handleResetPassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetPasswordUser) return;

        passwordForm.post(`/dev-admin/tenants/${tenant.id}/users/${resetPasswordUser.id}/reset-password`, {
            onSuccess: () => {
                setResetPasswordUser(null);
                passwordForm.reset();
            },
        });
    };

    const handleApprovePlan = (plan: string, extraUsers?: number) => {
        const extras = extraUsers ?? tenant.requested_extra_users ?? 0;
        const planLabel = plans[plan]?.name ?? plan;
        const seats = (plans[plan]?.users ?? 0) + extras;

        if (
            confirm(
                `Ativar o plano "${planLabel}" para "${tenant.name}" com ${seats} usuários? O período de teste será encerrado.`,
            )
        ) {
            router.post(
                `/dev-admin/tenants/${tenant.id}/approve-plan`,
                { plan, extra_users: extras },
                { preserveScroll: true },
            );
        }
    };

    const handleRejectPlan = () => {
        if (confirm('Descartar a solicitação de plano? A organização poderá solicitar novamente.')) {
            router.post(`/dev-admin/tenants/${tenant.id}/reject-plan`, {}, { preserveScroll: true });
        }
    };

    const handleExtendTrial = (days: number) => {
        router.post(
            `/dev-admin/tenants/${tenant.id}/extend-trial`,
            { days },
            { preserveScroll: true },
        );
    };

    const getHealthBadge = (status: 'active' | 'attention' | 'risk') => {
        switch (status) {
            case 'active':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Ativa & Saudável
                    </span>
                );
            case 'attention':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Atenção ({metrics.days_inactive} dias s/ atividade)
                    </span>
                );
            case 'risk':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 animate-pulse">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Em Risco / Inativa
                    </span>
                );
        }
    };

    return (
        <DevAdminLayout>
            <Head title={`Detalhes - ${tenant.name}`} />

            {/* Cabeçalho da Organização */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Building className="h-8 w-8 text-primary" /> {tenant.name}
                        </h1>
                        <TenantStatusBadge tenant={tenant} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        {tenant.legal_name ? `${tenant.legal_name} • ` : ''}Slug: {tenant.slug} • ID: {tenant.id}
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <Button
                        onClick={handleImpersonate}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold gap-2"
                    >
                        <LogIn className="h-4 w-4" />
                        Acessar como Clínica
                    </Button>
                    <Button variant="outline" asChild>
                        <a href={`/dev-admin/tenants/${tenant.id}/export`} download className="gap-1.5">
                            <Download className="h-4 w-4 text-primary" />
                            Exportar (LGPD)
                        </a>
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditDrawerOpen(true)}>
                        Editar
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/dev-admin/tenants">Voltar</Link>
                    </Button>
                </div>
            </div>

            {/* Assinatura: trial, solicitação de plano e ativação */}
            <Card className={`mb-8 ${tenant.has_pending_plan_request ? 'border-primary/40 bg-primary/5' : ''}`}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <PackageCheck className="h-4 w-4 text-primary" />
                        Assinatura e período de teste
                    </CardTitle>
                    <CardDescription>
                        {tenant.self_registered
                            ? 'Organização criada pelo próprio cliente na landing page.'
                            : 'Organização criada manualmente pelo dev admin.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <p className="text-xs text-muted-foreground">Plano atual</p>
                            <p className="font-medium">{plans[tenant.plan]?.name ?? tenant.plan}</p>
                            <p className="text-xs text-muted-foreground">
                                {tenant.users?.length ?? 0}/{tenant.max_users} usuários
                                {tenant.extra_users > 0 ? ` (${tenant.extra_users} adicionais)` : ''}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Situação de acesso</p>
                            <div className="mt-0.5">
                                <TenantStatusBadge tenant={tenant} />
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Fim do teste</p>
                            <p className="font-medium">
                                {tenant.trial_ends_at
                                    ? new Date(tenant.trial_ends_at).toLocaleDateString('pt-BR')
                                    : 'Sem período de teste'}
                            </p>
                        </div>
                    </div>

                    {tenant.has_pending_plan_request && (
                        <div className="rounded-lg border border-primary/30 bg-background p-4">
                            <p className="text-sm font-semibold text-foreground">
                                Solicitou o plano {plans[tenant.requested_plan]?.name ?? tenant.requested_plan}
                                {tenant.requested_extra_users > 0
                                    ? ` + ${tenant.requested_extra_users} usuários adicionais (${(tenant.requested_extra_users * extraUserPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês)`
                                    : ''}
                                {tenant.plan_requested_at
                                    ? ` em ${new Date(tenant.plan_requested_at).toLocaleDateString('pt-BR')}`
                                    : ''}
                            </p>
                            {tenant.plan_request_notes && (
                                <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
                                    “{tenant.plan_request_notes}”
                                </p>
                            )}
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Button size="sm" onClick={() => handleApprovePlan(tenant.requested_plan)}>
                                    Ativar plano solicitado
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleRejectPlan}>
                                    Descartar solicitação
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="border-t pt-4">
                        <p className="mb-2 text-sm text-muted-foreground">Ativar plano manualmente</p>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(plans)
                                .filter(([, plan]) => plan.selectable)
                                .map(([key, plan]) => (
                                    <Button
                                        key={key}
                                        size="sm"
                                        variant={tenant.plan === key ? 'secondary' : 'outline'}
                                        disabled={tenant.plan === key}
                                        onClick={() => handleApprovePlan(key, 0)}
                                    >
                                        {plan.name} · {plan.users} usuários
                                    </Button>
                                ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                        <span className="text-sm text-muted-foreground">Estender teste em</span>
                        {[7, 15, 30].map((days) => (
                            <Button
                                key={days}
                                size="sm"
                                variant="outline"
                                onClick={() => handleExtendTrial(days)}
                            >
                                +{days} dias
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Health Score & Métricas de Engajamento */}
            <div className="grid gap-4 md:grid-cols-4 mb-8">
                <Card className="border-l-4 border-l-primary shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Saúde do Cliente</CardTitle>
                        <HeartPulse className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="mt-1">{getHealthBadge(metrics.health_status)}</div>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {metrics.last_activity_text}
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Pacientes Cadastrados</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.total_patients}</div>
                        <p className="text-xs text-muted-foreground mt-1">Base ativa da clínica</p>
                    </CardContent>
                </Card>

                <Card className="shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Agendamentos no Mês</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.appointments_this_month}</div>
                        <p className="text-xs text-muted-foreground mt-1">Sessões marcadas neste mês</p>
                    </CardContent>
                </Card>

                <Card className="shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Evoluções Clínicas</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.total_evolutions}</div>
                        <p className="text-xs text-muted-foreground mt-1">Prontuários e sessões preenchidas</p>
                    </CardContent>
                </Card>
            </div>

            {/* Grid com Informações Gerais e Usuários */}
            <div className="grid gap-6 md:grid-cols-3 mb-8">
                {/* Informações Cadastrais e Endereço */}
                <Card className="shadow-xs">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Dados da Organização</CardTitle>
                        <CardDescription>Parâmetros cadastrais, endereço e equipe técnica.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs sm:text-sm">
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-muted-foreground">Plano Atual:</span>
                            <span className="font-semibold capitalize text-foreground">{tenant.plan}</span>
                        </div>

                        {tenant.legal_name && (
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-muted-foreground">Razão Social:</span>
                                <span className="font-medium text-foreground text-right">{tenant.legal_name}</span>
                            </div>
                        )}

                        <div className="flex justify-between border-b pb-2">
                            <span className="text-muted-foreground">CNPJ / CPF:</span>
                            <span className="font-medium text-foreground">{tenant.document || 'Não informado'}</span>
                        </div>

                        {tenant.state_registration && (
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-muted-foreground">Inscrição Est./Mun.:</span>
                                <span className="font-medium text-foreground">{tenant.state_registration}</span>
                            </div>
                        )}

                        {/* Endereço */}
                        <div className="border-b pb-2">
                            <span className="text-muted-foreground block mb-1">Endereço Físico:</span>
                            <p className="font-medium text-foreground">
                                {tenant.formatted_address || tenant.address || 'Não informado'}
                            </p>
                        </div>

                        {/* Contatos */}
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="font-medium text-foreground">{tenant.email || 'Não informado'}</span>
                        </div>

                        <div className="flex justify-between border-b pb-2">
                            <span className="text-muted-foreground">Telefone:</span>
                            <span className="font-medium text-foreground">{tenant.phone || 'Não informado'}</span>
                        </div>

                        {tenant.whatsapp && (
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-muted-foreground">WhatsApp:</span>
                                <a
                                    href={`https://wa.me/55${tenant.whatsapp.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-medium text-emerald-600 hover:underline"
                                >
                                    {tenant.whatsapp}
                                </a>
                            </div>
                        )}

                        {tenant.website && (
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-muted-foreground">Website/Rede:</span>
                                <span className="font-medium text-foreground truncate max-w-[180px]">{tenant.website}</span>
                            </div>
                        )}

                        {/* Responsável Técnico */}
                        {(tenant.technical_manager_name || tenant.technical_manager_document) && (
                            <div className="border-b pb-2">
                                <span className="text-muted-foreground block mb-1">Responsável Técnico (RT):</span>
                                <p className="font-medium text-foreground">
                                    {tenant.technical_manager_name || 'Profissional não especificado'}
                                    {tenant.technical_manager_document ? ` (${tenant.technical_manager_document})` : ''}
                                </p>
                            </div>
                        )}

                        <div className="flex justify-between border-b pb-2">
                            <span className="text-muted-foreground">Limite de Usuários:</span>
                            <span className="font-semibold text-foreground">{tenant.users?.length || 0} / {tenant.max_users}</span>
                        </div>

                        <div className="flex justify-between border-b pb-2">
                            <span className="text-muted-foreground">Limite de Armazenamento:</span>
                            <span className="font-semibold text-foreground">{tenant.max_storage_mb || 1024} MB</span>
                        </div>

                        <div className="pt-2">
                            <span className="text-xs text-muted-foreground block mb-2 font-medium">Módulos Habilitados:</span>
                            <div className="flex flex-wrap gap-1.5">
                                {tenant.features?.financial !== false && (
                                    <span className="px-2 py-0.5 text-[11px] rounded bg-primary/10 text-primary font-medium">Financeiro</span>
                                )}
                                {tenant.features?.group_classes !== false && (
                                    <span className="px-2 py-0.5 text-[11px] rounded bg-primary/10 text-primary font-medium">Turmas</span>
                                )}
                                {tenant.features?.clinical_protocols !== false && (
                                    <span className="px-2 py-0.5 text-[11px] rounded bg-primary/10 text-primary font-medium">Protocolos</span>
                                )}
                                {tenant.features?.reports !== false && (
                                    <span className="px-2 py-0.5 text-[11px] rounded bg-primary/10 text-primary font-medium">Relatórios</span>
                                )}
                                {tenant.features?.evolution_photos !== false && (
                                    <span className="px-2 py-0.5 text-[11px] rounded bg-primary/10 text-primary font-medium">Fotos</span>
                                )}
                            </div>
                        </div>

                        {tenant.notes && (
                            <div className="pt-2 border-t text-xs text-muted-foreground bg-muted/20 p-2.5 rounded">
                                <span className="font-semibold text-foreground block mb-1">Notas Internas:</span>
                                {tenant.notes}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Gestão Direta de Usuários da Clínica */}
                <Card className="md:col-span-2 shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <div>
                            <CardTitle className="text-base font-semibold">Usuários da Organização</CardTitle>
                            <CardDescription>Profissionais e atendentes cadastrados nesta clínica.</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => setIsAddUserOpen(true)} className="gap-1.5">
                            <UserPlus className="h-4 w-4" />
                            Novo Usuário
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Perfil</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tenant.users && tenant.users.length > 0 ? (
                                        tenant.users.map((u: any) => (
                                            <TableRow key={u.id}>
                                                <TableCell className="font-medium">{u.name}</TableCell>
                                                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                                                <TableCell>
                                                    <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 capitalize">
                                                        {u.roles?.[0]?.name || 'Usuário'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setResetPasswordUser(u)}
                                                        className="text-xs text-primary hover:text-primary gap-1"
                                                    >
                                                        <KeyRound className="h-3.5 w-3.5" />
                                                        Resetar Senha
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                                                Nenhum usuário cadastrado nesta organização ainda.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Histórico de Uso Diário */}
            <Card className="shadow-xs mb-8">
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Histórico de Uso de Recursos</CardTitle>
                    <CardDescription>Instantâneos automáticos de volume de dados diários.</CardDescription>
                </CardHeader>
                <CardContent>
                    {usageLogs && usageLogs.length > 0 ? (
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead>Data de Referência</TableHead>
                                        <TableHead>Pacientes</TableHead>
                                        <TableHead>Agendamentos</TableHead>
                                        <TableHead>Armazenamento (MB)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {usageLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="font-medium">
                                                {new Date(log.reference_date).toLocaleDateString('pt-BR')}
                                            </TableCell>
                                            <TableCell>{log.patients_count}</TableCell>
                                            <TableCell>{log.appointments_count}</TableCell>
                                            <TableCell>{log.storage_mb} MB</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                            <Activity className="h-8 w-8 mb-2 opacity-40" />
                            <p className="font-medium">Nenhum log diário registrado ainda.</p>
                            <p className="text-xs">Os instantâneos são compilados diariamente às 00:00.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal: Adicionar Usuário para a Clínica */}
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Novo Usuário para {tenant.name}</DialogTitle>
                        <DialogDescription>
                            Crie um novo acesso administrativo ou profissional para esta organização.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateUser} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="user-name">Nome Completo</Label>
                            <Input
                                id="user-name"
                                value={userForm.data.name}
                                onChange={(e) => userForm.setData('name', e.target.value)}
                                placeholder="Ex: Dra. Mariana Silva"
                                required
                            />
                            {userForm.errors.name && <p className="text-xs text-red-500">{userForm.errors.name}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="user-email">E-mail de Acesso</Label>
                            <Input
                                id="user-email"
                                type="email"
                                value={userForm.data.email}
                                onChange={(e) => userForm.setData('email', e.target.value)}
                                placeholder="mariana@clinica.com"
                                required
                            />
                            {userForm.errors.email && <p className="text-xs text-red-500">{userForm.errors.email}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="user-password">Senha Provisória</Label>
                            <Input
                                id="user-password"
                                type="password"
                                value={userForm.data.password}
                                onChange={(e) => userForm.setData('password', e.target.value)}
                                placeholder="Mínimo 8 caracteres"
                                required
                            />
                            {userForm.errors.password && <p className="text-xs text-red-500">{userForm.errors.password}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="user-role">Perfil / Função</Label>
                            <Select value={userForm.data.role} onValueChange={(val) => userForm.setData('role', val)}>
                                <SelectTrigger id="user-role">
                                    <SelectValue placeholder="Selecione o perfil" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Administrador da Clínica</SelectItem>
                                    <SelectItem value="professional">Fisioterapeuta / Instrutor</SelectItem>
                                    <SelectItem value="attendant">Recepcionista / Atendente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={userForm.processing}>
                                Criar Usuário
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Redefinir Senha do Usuário */}
            <Dialog open={!!resetPasswordUser} onOpenChange={(open) => !open && setResetPasswordUser(null)}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Redefinir Senha</DialogTitle>
                        <DialogDescription>
                            Defina uma nova senha para <strong>{resetPasswordUser?.name}</strong> ({resetPasswordUser?.email}).
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleResetPassword} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="new-password">Nova Senha</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={passwordForm.data.password}
                                onChange={(e) => passwordForm.setData('password', e.target.value)}
                                placeholder="Mínimo 8 caracteres"
                                required
                            />
                            {passwordForm.errors.password && <p className="text-xs text-red-500">{passwordForm.errors.password}</p>}
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setResetPasswordUser(null)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={passwordForm.processing}>
                                Salvar Nova Senha
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Drawer Lateral de Edição da Organização */}
            <TenantFormSheet
                open={isEditDrawerOpen}
                onOpenChange={setIsEditDrawerOpen}
                tenant={tenant}
            />
        </DevAdminLayout>
    );
}
