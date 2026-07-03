import { Head, Link, router, usePage, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { ArrowLeft, Phone, MapPin, Edit, Trash2, Calendar, FileText, Cake, Clock, Activity, Mail, User, Shield, Heart, Briefcase, Plus, Tag, DollarSign, CheckCircle, RotateCcw, AlertTriangle, Download, Upload, Eye, X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { useConfirmModal } from '@/components/confirm-modal';
import { useState } from 'react';
import EvolutionFormSheet from '@/components/EvolutionFormSheet';
import { AppointmentFormSheet } from '../appointments/appointment-form-sheet';
import { MembershipFormSheet } from '../memberships/membership-form-sheet';
import { PatientFormSheet } from './PatientFormSheet';
import { InlineEdit } from '@/components/inline-edit';
import { usePermissions } from '@/hooks/use-permissions';

interface Patient {
    id: string;
    name: string;
    nickname: string | null;
    phone: string | null;
    email: string | null;
    type: 'pilates' | 'physiotherapy';
    cpf: string | null;
    rg: string | null;
    gender: string | null;
    profession: string | null;
    address: string | null;
    birthdate: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    health_notes: string | null;
    cep: string | null;
    street: string | null;
    number: string | null;
    complement: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    appointments: Array<{
        id: string;
        appointment_date: string;
        start_time: string;
        duration_minutes: number;
        status: string;
        notes: string | null;
        pivot?: {
            status: string;
        };
    }>;
    evolutions: Array<{
        id: string;
        data_atendimento: string;
        tipo_atendimento: string;
        queixa_principal: string | null;
        condutas_realizadas: string | null;
        observacoes?: string | null;
    }>;
    memberships?: Array<{
        id: string;
        plan_name: string;
        start_date: string;
        end_date: string;
        price: string;
        status: string;
        monthly_allowance?: number | null;
        sessions_used_this_month?: number;
        sessions_remaining_this_month?: number | null;
    }>;
    financial_transactions?: Array<{
        id: string;
        type: 'income' | 'expense';
        amount: string;
        date: string;
        due_date: string | null;
        paid_at: string | null;
        description: string;
        category: string | null;
        status: 'paid' | 'pending';
    }>;
    documents?: Array<{
        id: string;
        file_path: string;
        original_name: string;
        description: string | null;
        created_at: string;
    }>;
}

interface FinancialSummary {
    total_received: number;
    total_pending: number;
    overdue_amount: number;
}

interface TimelineItem {
    id: string;
    date: string;
    type: 'appointment' | 'evolution';
    data: any;
}

type Tab = 'info' | 'memberships' | 'financial' | 'evolutions' | 'appointments' | 'documents';

export default function PatientShow({ patient, protocols = [], commercialPlans = [], financialSummary }: { patient: Patient, protocols?: Array<{ id: string; name: string }>, commercialPlans?: any[], financialSummary?: FinancialSummary }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Pacientes', href: '/patients' },
        { title: patient.nickname || patient.name, href: `/patients/${patient.id}` },
    ];

    const { url } = usePage();
    const queryParams = new URLSearchParams(url.split('?')[1]);
    const initialTab = (queryParams.get('tab') as Tab) || 'info';

    const [activeTab, setActiveTab] = useState<Tab>(initialTab);
    const [isEvolutionSheetOpen, setIsEvolutionSheetOpen] = useState(false);
    const [editingEvolution, setEditingEvolution] = useState<any>(null);
    const [isAppointmentSheetOpen, setIsAppointmentSheetOpen] = useState(false);
    const [isMembershipSheetOpen, setIsMembershipSheetOpen] = useState(false);
    const [isPatientFormOpen, setIsPatientFormOpen] = useState(false);
    const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'missed'>('all');
    const [previewingDoc, setPreviewingDoc] = useState<{ id: string; original_name: string } | null>(null);
    const { confirm, modal } = useConfirmModal();
    const { can } = usePermissions();

    async function handleDelete() {
        const confirmed = await confirm({
            title: 'Excluir Paciente',
            message: `Tem certeza que deseja excluir "${patient.name}"? Essa ação não pode ser desfeita.`,
            confirmLabel: 'Excluir',
        });
        if (confirmed) router.delete(`/patients/${patient.id}`);
    }

    const docForm = useForm({
        file: null as File | null,
        description: '',
    });

    const handleDocSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        docForm.post(`/patients/${patient.id}/documents`, {
            preserveScroll: true,
            onSuccess: () => {
                docForm.reset();
                const fileInput = document.getElementById('doc-file') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
            }
        });
    };

    async function handleDeleteDoc(id: string, name: string) {
        const confirmed = await confirm({
            title: 'Excluir Documento',
            message: `Tem certeza que deseja excluir o documento "${name}"? Essa ação não pode ser desfeita.`,
            confirmLabel: 'Excluir',
        });
        if (confirmed) {
            router.delete(`/patients/documents/${id}`, {
                preserveScroll: true,
            });
        }
    }

    const evolutionsList = [...patient.evolutions].sort((a, b) => new Date(b.data_atendimento).getTime() - new Date(a.data_atendimento).getTime());
    const appointmentsList = [...patient.appointments].sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime());
    const financialList = [...(patient.financial_transactions || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const missedAppointments = appointmentsList.filter(app => (app.pivot?.status || app.status) === 'missed');
    const displayedAppointments = appointmentsList.filter(app => {
        if (appointmentFilter === 'missed') {
            return (app.pivot?.status || app.status) === 'missed';
        }
        return true;
    });

    const formatCurrency = (val: string | number) => Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const isTxOverdue = (t: { status: string; due_date: string | null }) => t.status === 'pending' && !!t.due_date && new Date(t.due_date) < new Date();

    function openReceipt(id: string) {
        const a = document.createElement('a');
        a.href = `/financial/${id}/receipt`;
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    async function handleMarkPaid(t: { id: string; description: string; amount: string; type: string }) {
        const verb = t.type === 'income' ? 'recebido' : 'pago';
        const confirmed = await confirm({
            title: t.type === 'income' ? 'Confirmar recebimento' : 'Confirmar pagamento',
            message: `Confirma que "${t.description}" (${formatCurrency(t.amount)}) foi ${verb}?`,
            confirmLabel: 'Confirmar',
            variant: 'warning',
        });
        if (!confirmed) return;

        router.post(`/financial/${t.id}/mark-paid`, {}, {
            preserveScroll: true,
            onSuccess: async () => {
                if (t.type !== 'income') return;
                const wantsReceipt = await confirm({
                    title: 'Gerar recibo?',
                    message: 'Deseja gerar o recibo deste pagamento para o paciente?',
                    confirmLabel: 'Gerar recibo',
                });
                if (wantsReceipt) openReceipt(t.id);
            },
        });
    }

    async function handleRevert(t: { id: string; description: string; amount: string }) {
        const confirmed = await confirm({
            title: 'Estornar pagamento',
            message: `Desfazer a baixa de "${t.description}" (${formatCurrency(t.amount)})? Ela voltará para pendente.`,
            confirmLabel: 'Estornar',
            variant: 'warning',
        });
        if (confirmed) router.post(`/financial/${t.id}/mark-pending`, {}, { preserveScroll: true });
    }

    const statusLabel: Record<string, string> = { 
        scheduled: 'Agendado', 
        completed: 'Realizado', 
        attended: 'Presença', 
        missed: 'Falta', 
        cancelled: 'Cancelado' 
    };
    const statusColor: Record<string, string> = { 
        scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', 
        completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', 
        attended: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', 
        missed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', 
        cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
    };
    const dotColor: Record<string, string> = {
        scheduled: 'bg-blue-500',
        completed: 'bg-emerald-500',
        attended: 'bg-emerald-500',
        missed: 'bg-amber-500',
        cancelled: 'bg-red-500'
    };
    const tipoLabel: Record<string, string> = { avaliacao: 'Avaliação', reavaliacao: 'Reavaliação', sessao: 'Sessão' };
    const genderLabel: Record<string, string> = { male: 'Masculino', female: 'Feminino', other: 'Outro' };

    const age = patient.birthdate
        ? Math.floor((new Date().getTime() - new Date(patient.birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null;

    const activeMembership = patient.memberships?.find(m => m.status === 'active');

    const fullAddress = [patient.street, patient.number, patient.complement, patient.neighborhood, patient.city, patient.state].filter(Boolean).join(', ');

    const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
        { key: 'info', label: 'Informações Pessoais', icon: <User className="size-4" /> },
        { key: 'memberships', label: 'Matrículas', icon: <Tag className="size-4" />, count: patient.memberships?.length },
        { key: 'financial', label: 'Financeiro', icon: <DollarSign className="size-4" />, count: financialList.length },
        { key: 'evolutions', label: 'Prontuário', icon: <Activity className="size-4" />, count: evolutionsList.length },
        { key: 'appointments', label: 'Agendamentos', icon: <Calendar className="size-4" />, count: appointmentsList.length },
        { key: 'documents', label: 'Documentos', icon: <FileText className="size-4" />, count: patient.documents?.length },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={patient.name} />
            <div className="flex h-full flex-1 flex-col gap-6 p-6 md:p-10 max-w-5xl mx-auto w-full">

                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/patients" className="p-2 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="size-5" />
                        </Link>
                        <div className="flex items-center gap-4">
                            <div className="size-16 rounded-2xl bg-gradient-to-br from-primary/20 to-emerald-500/20 flex items-center justify-center text-primary text-2xl font-bold shadow-inner">
                                {(patient.nickname || patient.name).charAt(0).toUpperCase()}
                            </div>
                            <div>
                                {can('patients.manage.edit') ? (
                                    <InlineEdit
                                        value={patient.name}
                                        onSave={(val) => router.put(`/patients/${patient.id}`, { name: val }, { preserveScroll: true })}
                                        className="text-2xl font-bold tracking-tight bg-transparent"
                                    />
                                ) : (
                                    <span className="text-2xl font-bold tracking-tight">{patient.name}</span>
                                )}
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-sm text-muted-foreground">
                                        {can('patients.manage.edit') ? (
                                            <InlineEdit
                                                value={patient.nickname || ''}
                                                placeholder="Adicionar apelido..."
                                                onSave={(val) => router.put(`/patients/${patient.id}`, { nickname: val }, { preserveScroll: true })}
                                                className="bg-transparent"
                                                renderDisplay={(val) => <span>{val ? `"${val}"` : 'Adicionar apelido'}</span>}
                                            />
                                        ) : (
                                            patient.nickname && <span>"{patient.nickname}"</span>
                                        )}
                                    </span>
                                    <span className={`inline-flex px-3 py-0.5 rounded-full text-xs font-semibold ${patient.type === 'pilates' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                        {can('patients.manage.edit') ? (
                                            <InlineEdit
                                                value={patient.type}
                                                type="select"
                                                options={[
                                                    { value: 'pilates', label: 'Pilates' },
                                                    { value: 'physiotherapy', label: 'Fisioterapia' }
                                                ]}
                                                onSave={(val) => router.put(`/patients/${patient.id}`, { type: val }, { preserveScroll: true })}
                                                className="font-semibold text-xs bg-transparent"
                                            />
                                        ) : (
                                            <span className="font-semibold text-xs">{patient.type === 'pilates' ? 'Pilates' : 'Fisioterapia'}</span>
                                        )}
                                    </span>
                                    {activeMembership ? (
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                            ✓ Plano Ativo
                                        </span>
                                    ) : (
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                            Sem Plano
                                        </span>
                                    )}
                                    {age !== null && (
                                        <span className="text-sm text-muted-foreground">{age} anos</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {can('patients.manage.edit') && (
                            <button onClick={() => setIsPatientFormOpen(true)} className="p-2.5 rounded-xl border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                                <Edit className="size-4" />
                            </button>
                        )}
                        {can('patients.manage.delete') && (
                            <button onClick={handleDelete} className="p-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors">
                                <Trash2 className="size-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Quick actions */}
                <div className="flex gap-3 flex-wrap">
                    {can('appointments.manage.create') && (
                        <button onClick={() => setIsAppointmentSheetOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-semibold hover:bg-primary/20 transition-colors">
                            <Calendar className="size-4" /> Novo Agendamento
                        </button>
                    )}
                    {can('evolutions.manage.create') && (
                        <button onClick={() => { setEditingEvolution(null); setIsEvolutionSheetOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-600 rounded-xl text-sm font-semibold hover:bg-indigo-500/20 transition-colors">
                            <Activity className="size-4" /> Nova Evolução
                        </button>
                    )}
                    {can('memberships.manage.create') && (
                        <button onClick={() => setIsMembershipSheetOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-xl text-sm font-semibold hover:bg-emerald-500/20 transition-colors">
                            <Plus className="size-4" /> Nova Matrícula
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-1 bg-muted/30 p-1 rounded-xl border border-border/30">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-grow sm:flex-1 min-w-[140px] justify-center ${activeTab === tab.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'}`}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-bold">{tab.count}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Tab: Informações Pessoais ── */}
                {activeTab === 'info' && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                        {/* Info Cards Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {patient.phone && (
                                <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-5 flex items-center gap-3">
                                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Phone className="size-4" /></div>
                                    <div><p className="text-xs text-muted-foreground">Telefone</p><p className="font-semibold text-sm">{patient.phone}</p></div>
                                </div>
                            )}
                            {patient.email && (
                                <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-5 flex items-center gap-3">
                                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Mail className="size-4" /></div>
                                    <div><p className="text-xs text-muted-foreground">E-mail</p><p className="font-semibold text-sm truncate">{patient.email}</p></div>
                                </div>
                            )}
                            {patient.cpf && (
                                <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-5 flex items-center gap-3">
                                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><FileText className="size-4" /></div>
                                    <div><p className="text-xs text-muted-foreground">CPF</p><p className="font-semibold text-sm">{patient.cpf}</p></div>
                                </div>
                            )}
                            {patient.birthdate && (
                                <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-5 flex items-center gap-3">
                                    <div className="p-2.5 bg-pink-500/10 rounded-xl text-pink-600"><Cake className="size-4" /></div>
                                    <div><p className="text-xs text-muted-foreground">Nascimento</p><p className="font-semibold text-sm">{new Date(patient.birthdate).toLocaleDateString('pt-BR')}</p></div>
                                </div>
                            )}
                            {missedAppointments.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveTab('appointments');
                                        setAppointmentFilter('missed');
                                    }}
                                    className="bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/10 dark:hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/30 rounded-2xl p-5 flex items-center gap-3 text-left transition-all active:scale-95 cursor-pointer shadow-sm hover:shadow"
                                >
                                    <div className="p-2.5 bg-amber-500/15 rounded-xl text-amber-600 dark:text-amber-400">
                                        <AlertTriangle className="size-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Faltas Registradas</p>
                                        <p className="font-bold text-sm text-amber-700 dark:text-amber-400">
                                            {missedAppointments.length} {missedAppointments.length === 1 ? 'falta' : 'faltas'}
                                        </p>
                                    </div>
                                </button>
                            )}
                        </div>

                        {/* Dados Detalhados */}
                        <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-sm">
                            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                                <User className="size-4 text-primary" /> Dados Pessoais
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                                {patient.gender && <div><span className="text-muted-foreground">Sexo</span><p className="font-medium">{genderLabel[patient.gender] || patient.gender}</p></div>}
                                {patient.rg && <div><span className="text-muted-foreground">RG</span><p className="font-medium">{patient.rg}</p></div>}
                                {patient.profession && <div><span className="text-muted-foreground">Profissão</span><p className="font-medium">{patient.profession}</p></div>}
                            </div>
                        </div>

                        {/* Endereço */}
                        {(fullAddress || patient.cep) && (
                            <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-sm">
                                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                                    <MapPin className="size-4 text-primary" /> Endereço
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                                    {patient.cep && <div><span className="text-muted-foreground">CEP</span><p className="font-medium">{patient.cep}</p></div>}
                                    {patient.street && <div><span className="text-muted-foreground">Logradouro</span><p className="font-medium">{patient.street}{patient.number ? `, ${patient.number}` : ''}</p></div>}
                                    {patient.complement && <div><span className="text-muted-foreground">Complemento</span><p className="font-medium">{patient.complement}</p></div>}
                                    {patient.neighborhood && <div><span className="text-muted-foreground">Bairro</span><p className="font-medium">{patient.neighborhood}</p></div>}
                                    {patient.city && <div><span className="text-muted-foreground">Cidade</span><p className="font-medium">{patient.city}</p></div>}
                                    {patient.state && <div><span className="text-muted-foreground">UF</span><p className="font-medium">{patient.state}</p></div>}
                                </div>
                            </div>
                        )}

                        {/* Emergência & Saúde */}
                        {(patient.emergency_contact_name || patient.health_notes) && (
                            <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-sm">
                                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                                    <Heart className="size-4 text-red-500" /> Contato de Emergência & Saúde
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                    {patient.emergency_contact_name && <div><span className="text-muted-foreground">Contato de Emergência</span><p className="font-medium">{patient.emergency_contact_name} {patient.emergency_contact_phone && `• ${patient.emergency_contact_phone}`}</p></div>}
                                </div>
                                {patient.health_notes && (
                                    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl text-sm">
                                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">⚠️ Observações Clínicas</p>
                                        <p className="text-amber-900 dark:text-amber-300 whitespace-pre-line">{patient.health_notes}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ── Tab: Matrículas ── */}
                {activeTab === 'memberships' && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Tag className="size-5 text-primary" /> Matrículas e Planos
                            </h2>
                            {can('memberships.manage.create') && (
                                <button onClick={() => setIsMembershipSheetOpen(true)} className="flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors text-sm shadow-sm">
                                    <Plus className="size-4" /> Nova Matrícula
                                </button>
                            )}
                        </div>

                        {patient.memberships && patient.memberships.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {patient.memberships.map(membership => (
                                    <Link key={membership.id} href={`/memberships/${membership.id}`} className="bg-gradient-to-br from-card to-card/50 border border-border/50 rounded-2xl p-5 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                                        <div className={`absolute top-0 left-0 w-1.5 h-full ${membership.status === 'active' ? 'bg-emerald-500' : membership.status === 'expired' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{membership.plan_name}</h3>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                                                membership.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                                membership.status === 'expired' ? 'bg-amber-100 text-amber-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                                {membership.status === 'active' ? 'Ativo' : membership.status === 'expired' ? 'Vencido' : 'Cancelado'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-1">
                                            {new Date(membership.start_date).toLocaleDateString('pt-BR')} a {new Date(membership.end_date).toLocaleDateString('pt-BR')}
                                        </p>
                                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                            R$ {parseFloat(membership.price).toFixed(2).replace('.', ',')}
                                        </p>
                                        {membership.monthly_allowance != null && (
                                            <div className="mt-3 pt-3 border-t border-border/40">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-xs text-muted-foreground">Aulas neste mês</span>
                                                    <span className="text-xs font-semibold text-foreground">
                                                        {membership.sessions_used_this_month} de {membership.monthly_allowance}
                                                        {membership.sessions_remaining_this_month === 0 && (
                                                            <span className="ml-1 text-amber-500 font-bold">• cota atingida</span>
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${membership.sessions_remaining_this_month === 0 ? 'bg-amber-500' : 'bg-primary'}`}
                                                        style={{ width: `${Math.min(100, ((membership.sessions_used_this_month ?? 0) / membership.monthly_allowance) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-12 text-center shadow-sm">
                                <Tag className="size-12 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-muted-foreground text-sm">Nenhuma matrícula cadastrada.</p>
                                <button onClick={() => setIsMembershipSheetOpen(true)} className="text-primary text-sm font-semibold hover:text-primary/80 mt-2 inline-block">
                                    Criar primeira matrícula →
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ── Tab: Financeiro ── */}
                {activeTab === 'financial' && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        {/* KPIs */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-1 text-emerald-600"><CheckCircle className="size-4" /><span className="text-xs font-medium text-muted-foreground">Total Recebido</span></div>
                                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(financialSummary?.total_received ?? 0)}</p>
                            </div>
                            <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-1 text-amber-600"><Clock className="size-4" /><span className="text-xs font-medium text-muted-foreground">A Receber</span></div>
                                <p className="text-2xl font-bold text-amber-600">{formatCurrency(financialSummary?.total_pending ?? 0)}</p>
                            </div>
                            <div className={`border rounded-2xl p-5 ${(financialSummary?.overdue_amount ?? 0) > 0 ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30' : 'bg-card/60 border-border/50 backdrop-blur-xl'}`}>
                                <div className="flex items-center gap-2 mb-1 text-red-600"><AlertTriangle className="size-4" /><span className="text-xs font-medium text-muted-foreground">Vencido</span></div>
                                <p className={`text-2xl font-bold ${(financialSummary?.overdue_amount ?? 0) > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{formatCurrency(financialSummary?.overdue_amount ?? 0)}</p>
                            </div>
                        </div>

                        <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <DollarSign className="size-5 text-primary" /> Histórico de Pagamentos
                                    <span className="text-sm font-normal text-muted-foreground ml-2">({financialList.length})</span>
                                </h2>
                                <Link href={`/financial?search=${encodeURIComponent(patient.name)}`} className="text-sm font-medium text-primary hover:underline">Ver no financeiro →</Link>
                            </div>

                            {financialList.length === 0 ? (
                                <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
                                    <DollarSign className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                                    <p className="text-sm text-muted-foreground font-medium">Nenhum lançamento financeiro para este paciente.</p>
                                    <p className="text-xs text-muted-foreground mt-1">As mensalidades e cobranças aparecerão aqui.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border/50">
                                    {financialList.map(t => {
                                        const overdue = isTxOverdue(t);
                                        return (
                                            <div key={t.id} className="flex items-center gap-3 py-3 group">
                                                <div className={`size-2 rounded-full flex-shrink-0 ${t.type === 'income' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-foreground text-sm truncate">{t.description}</div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                                        <span>{new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                                                        {t.category && <span>• {t.category}</span>}
                                                        {t.status === 'paid' && t.paid_at && (
                                                            <span className="text-emerald-600/80">• Baixado em {new Date(t.paid_at).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                                                        )}
                                                        {t.status === 'pending' && t.due_date && (
                                                            <span className={overdue ? 'text-red-600 font-semibold' : ''}>• Vence {new Date(t.due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className={`font-bold text-sm whitespace-nowrap ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                                                </div>
                                                <div className="w-20 flex justify-end">
                                                    {overdue ? (
                                                        <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Vencido</span>
                                                    ) : t.status === 'paid' ? (
                                                        <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Pago</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Pendente</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {t.status === 'paid' && t.type === 'income' && (
                                                        <button onClick={() => openReceipt(t.id)} className="p-2 text-muted-foreground hover:text-blue-600 rounded-lg hover:bg-blue-500/10 transition-colors" title="Gerar/reimprimir recibo">
                                                            <FileText className="size-4" />
                                                        </button>
                                                    )}
                                                    {t.status === 'pending' ? (
                                                        <button onClick={() => handleMarkPaid(t)} className="p-2 text-muted-foreground hover:text-emerald-600 rounded-lg hover:bg-emerald-500/10 transition-colors" title="Confirmar recebimento">
                                                            <CheckCircle className="size-4" />
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => handleRevert(t)} className="p-2 text-muted-foreground hover:text-amber-600 rounded-lg hover:bg-amber-500/10 transition-colors" title="Estornar (voltar para pendente)">
                                                            <RotateCcw className="size-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* ── Tab: Prontuário (Evoluções) ── */}
                {activeTab === 'evolutions' && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Activity className="size-5 text-primary" /> Prontuário
                                    <span className="text-sm font-normal text-muted-foreground ml-2">({evolutionsList.length} registros)</span>
                                </h2>
                                {can('evolutions.manage.create') && (
                                    <button onClick={() => { setEditingEvolution(null); setIsEvolutionSheetOpen(true); }} className="flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors text-sm shadow-sm">
                                        <Plus className="size-4" /> Nova Evolução
                                    </button>
                                )}
                            </div>

                            {evolutionsList.length === 0 ? (
                                <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
                                    <Activity className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                                    <p className="text-sm text-muted-foreground font-medium">Nenhuma evolução registrada.</p>
                                    <p className="text-xs text-muted-foreground mt-1">O histórico clínico do paciente aparecerá aqui.</p>
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-border/50" />
                                    <div className="space-y-1">
                                        {evolutionsList.map((evo, i) => (
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                key={evo.id}
                                                className="relative flex gap-4 pl-10 py-3 hover:bg-muted/20 rounded-xl transition-colors group"
                                            >
                                                <div className="absolute left-2.5 top-5 size-3 rounded-full border-2 border-background bg-indigo-500" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <span className="text-xs font-medium text-muted-foreground">
                                                            {new Date(evo.data_atendimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                                        </span>
                                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                                                            {tipoLabel[evo.tipo_atendimento] || evo.tipo_atendimento}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                                        {evo.observacoes || evo.queixa_principal || evo.condutas_realizadas || 'Sem detalhes'}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col gap-2 self-center items-end">
                                                    <Link href={`/evolutions/${evo.id}`} className="text-xs font-medium text-primary hover:underline">Ver →</Link>
                                                    <button onClick={() => { setEditingEvolution(evo); setIsEvolutionSheetOpen(true); }} className="text-xs font-medium text-muted-foreground hover:text-foreground">Editar</button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* ── Tab: Agendamentos ── */}
                {activeTab === 'appointments' && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Calendar className="size-5 text-primary" /> Histórico de Agendamentos
                                    <span className="text-sm font-normal text-muted-foreground ml-2">({displayedAppointments.length} registros)</span>
                                </h2>
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1 bg-muted/50 p-1 rounded-xl border border-border/30 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setAppointmentFilter('all')}
                                            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                                                appointmentFilter === 'all'
                                                    ? 'bg-card text-foreground shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            Todos
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAppointmentFilter('missed')}
                                            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                                                appointmentFilter === 'missed'
                                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shadow-sm font-semibold'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            Faltas
                                            {missedAppointments.length > 0 && (
                                                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/15 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                                    {missedAppointments.length}
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                    {can('appointments.manage.create') && (
                                        <button onClick={() => setIsAppointmentSheetOpen(true)} className="flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors text-sm shadow-sm">
                                            <Plus className="size-4" /> Novo Agendamento
                                        </button>
                                    )}
                                </div>
                            </div>

                            {appointmentsList.length === 0 ? (
                                <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
                                    <Calendar className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                                    <p className="text-sm text-muted-foreground font-medium">Nenhum agendamento encontrado.</p>
                                </div>
                            ) : displayedAppointments.length === 0 ? (
                                <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
                                    <Calendar className="size-10 text-muted-foreground/30 mx-auto mb-3 text-amber-500" />
                                    <p className="text-sm text-muted-foreground font-medium">Nenhuma falta registrada para este paciente.</p>
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-border/50" />
                                    <div className="space-y-1">
                                        {displayedAppointments.map((app, i) => {
                                            const appStatus = app.pivot?.status || app.status;
                                            const statusDotClass = dotColor[appStatus] || 'bg-emerald-500';
                                            return (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.03 }}
                                                    key={app.id}
                                                    className="relative flex gap-4 pl-10 py-3 hover:bg-muted/20 rounded-xl transition-colors group"
                                                >
                                                    <div className={`absolute left-2.5 top-5 size-3 rounded-full border-2 border-background ${statusDotClass}`} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                            <span className="text-xs font-medium text-muted-foreground">
                                                                {new Date(app.appointment_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                                            </span>
                                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${statusColor[appStatus] || 'bg-emerald-100 text-emerald-700'}`}>{statusLabel[appStatus] || appStatus}</span>
                                                            {app.start_time && (
                                                                <span className="text-xs text-muted-foreground">{app.start_time.slice(0,5)} • {app.duration_minutes}min</span>
                                                            )}
                                                        </div>
                                                        {app.notes && (
                                                            <p className="text-sm text-muted-foreground line-clamp-1">{app.notes}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col gap-2 self-center items-end">
                                                        <Link href={`/appointments/${app.id}`} className="text-xs font-medium text-primary hover:underline">Ver →</Link>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* ── Tab: Documentos ── */}
                {activeTab === 'documents' && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Lista de Documentos */}
                        <div className="lg:col-span-2 bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
                                <FileText className="size-5 text-primary" /> Documentos Anexados
                                <span className="text-sm font-normal text-muted-foreground ml-2">
                                    ({patient.documents?.length || 0} arquivos)
                                </span>
                            </h2>

                            {!patient.documents || patient.documents.length === 0 ? (
                                <div className="text-center py-16 bg-muted/30 rounded-xl border border-dashed border-border">
                                    <FileText className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                                    <p className="text-sm text-muted-foreground font-medium">Nenhum documento anexado.</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Contratos, termos e outros arquivos salvos aparecerão aqui.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border/50">
                                    {patient.documents.map(doc => (
                                        <div key={doc.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0 group">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="p-2.5 bg-primary/10 rounded-xl text-primary flex-shrink-0">
                                                    <FileText className="size-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-sm text-foreground truncate" title={doc.original_name}>
                                                        {doc.original_name}
                                                    </p>
                                                    {doc.description && (
                                                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{doc.description}</p>
                                                    )}
                                                    <p className="text-[10px] text-muted-foreground/80 mt-1">
                                                        Enviado em {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => setPreviewingDoc({ id: doc.id, original_name: doc.original_name })}
                                                    className="p-2.5 text-muted-foreground hover:text-primary rounded-xl hover:bg-primary/10 transition-colors"
                                                    title="Visualizar arquivo"
                                                >
                                                    <Eye className="size-4" />
                                                </button>
                                                <a
                                                    href={`/patients/documents/${doc.id}/download`}
                                                    className="p-2.5 text-muted-foreground hover:text-primary rounded-xl hover:bg-primary/10 transition-colors"
                                                    title="Baixar arquivo"
                                                >
                                                    <Download className="size-4" />
                                                </a>
                                                {can('patients.manage.edit') && (
                                                    <button
                                                        onClick={() => handleDeleteDoc(doc.id, doc.original_name)}
                                                        className="p-2.5 text-muted-foreground hover:text-red-600 rounded-xl hover:bg-red-500/10 transition-colors"
                                                        title="Excluir arquivo"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Enviar Novo Documento */}
                        {can('patients.manage.edit') && (
                        <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-sm h-fit">
                            <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                                <Upload className="size-5 text-primary" /> Enviar Documento
                            </h3>

                            <form onSubmit={handleDocSubmit} className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="doc-file">Selecione o arquivo (PDF, PNG, JPG, JPEG - max 10MB)</Label>
                                    <Input
                                        id="doc-file"
                                        type="file"
                                        accept=".pdf,image/*"
                                        onChange={e => docForm.setData('file', e.target.files ? e.target.files[0] : null)}
                                        className="cursor-pointer file:text-primary file:font-semibold"
                                        required
                                    />
                                    {docForm.errors.file && (
                                        <p className="text-red-500 text-xs mt-1">{docForm.errors.file}</p>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="doc-desc">Descrição / Nome do Documento</Label>
                                    <Input
                                        id="doc-desc"
                                        placeholder="Ex: Contrato de Pilates 2026"
                                        value={docForm.data.description}
                                        onChange={e => docForm.setData('description', e.target.value)}
                                    />
                                    {docForm.errors.description && (
                                        <p className="text-red-500 text-xs mt-1">{docForm.errors.description}</p>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    disabled={docForm.processing || !docForm.data.file}
                                    className="w-full rounded-xl"
                                >
                                    {docForm.processing ? 'Enviando...' : 'Enviar Documento'}
                                </Button>
                            </form>
                        </div>
                        )}
                    </motion.div>
                )}

                {/* ── Document Preview Modal ── */}
                {previewingDoc && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setPreviewingDoc(null)}>
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="relative z-10 w-[95vw] max-w-4xl h-[90vh] bg-card border border-border/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50 bg-muted/30">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <FileText className="size-4" />
                                    </div>
                                    <p className="font-semibold text-sm text-foreground truncate">
                                        {previewingDoc.original_name}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <a
                                        href={`/patients/documents/${previewingDoc.id}/preview`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
                                        title="Abrir em nova aba"
                                    >
                                        <Maximize2 className="size-4" />
                                    </a>
                                    <a
                                        href={`/patients/documents/${previewingDoc.id}/download`}
                                        className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
                                        title="Baixar arquivo"
                                    >
                                        <Download className="size-4" />
                                    </a>
                                    <button
                                        onClick={() => setPreviewingDoc(null)}
                                        className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
                                        title="Fechar"
                                    >
                                        <X className="size-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-hidden bg-muted/20">
                                {previewingDoc.original_name.match(/\.(png|jpe?g|gif|webp|svg)$/i) ? (
                                    <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                                        <img
                                            src={`/patients/documents/${previewingDoc.id}/preview`}
                                            alt={previewingDoc.original_name}
                                            className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                                        />
                                    </div>
                                ) : (
                                    <iframe
                                        src={`/patients/documents/${previewingDoc.id}/preview`}
                                        className="w-full h-full border-0"
                                        title={previewingDoc.original_name}
                                    />
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
            {modal}
            <PatientFormSheet 
                open={isPatientFormOpen}
                onOpenChange={setIsPatientFormOpen}
                patient={patient}
            />
            <EvolutionFormSheet
                isOpen={isEvolutionSheetOpen}
                onOpenChange={setIsEvolutionSheetOpen}
                patientId={patient.id}
                protocols={protocols}
                evolution={editingEvolution}
            />
            <AppointmentFormSheet
                isOpen={isAppointmentSheetOpen}
                setIsOpen={setIsAppointmentSheetOpen}
                patients={[{ id: patient.id, name: patient.name }]}
                initialPatientId={patient.id}
            />
            <MembershipFormSheet
                isOpen={isMembershipSheetOpen}
                setIsOpen={setIsMembershipSheetOpen}
                patients={[{ id: patient.id, name: patient.name }]}
                commercialPlans={commercialPlans}
                initialPatientId={patient.id}
            />
        </AppLayout>
    );
}
