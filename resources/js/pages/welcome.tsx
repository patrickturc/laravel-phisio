import { Head, Link, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    Activity,
    ArrowRight,
    BarChart3,
    Bell,
    CalendarRange,
    Camera,
    CheckCircle2,
    ClipboardList,
    CreditCard,
    DollarSign,
    FileText,
    Lock,
    Mail,
    RefreshCw,
    ShieldCheck,
    Smartphone,
    Sparkles,
    Tag,
    Users,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { dashboard, login } from '@/routes';

type Props = {
    contactEmail: string | null;
};

type Feature = {
    icon: ComponentType<{ className?: string }>;
    title: string;
    description: string;
    tone: 'primary' | 'secondary';
};

const features: Feature[] = [
    {
        icon: CalendarRange,
        tone: 'primary',
        title: 'Agenda inteligente',
        description:
            'Visualização semanal, horários livres em grade, reagendamento por arrastar e soltar e controle de faltas em um clique.',
    },
    {
        icon: Users,
        tone: 'secondary',
        title: 'Prontuário do paciente',
        description:
            'Cadastro completo, documentos anexados, histórico clínico e aniversariantes da semana sempre à vista.',
    },
    {
        icon: FileText,
        tone: 'primary',
        title: 'Evoluções SOAP',
        description:
            'Registre Subjetivo, Objetivo, Avaliação e Plano com fotos de acompanhamento e exportação em PDF.',
    },
    {
        icon: ClipboardList,
        tone: 'secondary',
        title: 'Protocolos clínicos',
        description:
            'Padronize condutas por patologia e aplique planos de tratamento aos pacientes em segundos.',
    },
    {
        icon: Tag,
        tone: 'primary',
        title: 'Planos, pacotes e turmas',
        description:
            'Monte planos comerciais, controle matrículas com renovação e organize turmas de Pilates em grupo.',
    },
    {
        icon: DollarSign,
        tone: 'secondary',
        title: 'Financeiro integrado',
        description:
            'Fluxo de caixa, contas a receber, recibos e gastos recorrentes conectados às sessões realizadas.',
    },
    {
        icon: BarChart3,
        tone: 'primary',
        title: 'Relatórios gerenciais',
        description:
            'Indicadores de ocupação, faturamento e frequência para decidir com dados, não com achismo.',
    },
    {
        icon: ShieldCheck,
        tone: 'secondary',
        title: 'Perfis de acesso',
        description:
            'Defina exatamente o que recepção, fisioterapeutas e gestores podem ver e editar.',
    },
];

const steps = [
    {
        step: '01',
        title: 'Cadastre seus pacientes',
        description: 'Importe ou cadastre pacientes com dados clínicos, documentos e plano contratado.',
    },
    {
        step: '02',
        title: 'Monte a agenda',
        description: 'Defina horários, duração das sessões e turmas. Confirmações e faltas ficam registradas.',
    },
    {
        step: '03',
        title: 'Registre cada atendimento',
        description: 'Evolução SOAP com fotos ao final da sessão. O financeiro é atualizado automaticamente.',
    },
    {
        step: '04',
        title: 'Acompanhe os resultados',
        description: 'Relatórios de ocupação, receita e frequência mostram a saúde da clínica em tempo real.',
    },
];

const trust = [
    {
        icon: Lock,
        title: 'Autenticação em duas etapas',
        description: 'Proteção extra para o acesso de toda a equipe.',
    },
    {
        icon: ShieldCheck,
        title: 'Conformidade com a LGPD',
        description: 'Dados isolados por clínica, com exportação completa sob demanda.',
    },
    {
        icon: RefreshCw,
        title: 'Sincronização de calendário',
        description: 'Sua agenda no Google Calendar, Apple ou Outlook via feed iCal.',
    },
    {
        icon: Smartphone,
        title: 'Funciona como aplicativo',
        description: 'Instale no celular ou tablet e use na recepção ou na sala de atendimento.',
    },
];

const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
};

function Reveal({
    children,
    className,
    delay = 0,
}: {
    children: ReactNode;
    className?: string;
    delay?: number;
}) {
    return (
        <motion.div
            className={className}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
        >
            {children}
        </motion.div>
    );
}

function Logo({ className = '' }: { className?: string }) {
    return (
        <div className={`flex items-center gap-2.5 ${className}`}>
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary-foreground text-primary-foreground shadow-sm">
                <Activity className="size-5" />
            </div>
            <span className="bg-gradient-to-r from-primary to-secondary-foreground bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
                Phisio
            </span>
        </div>
    );
}

function SectionLabel({ children }: { children: ReactNode }) {
    return (
        <span className="inline-flex items-center rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold tracking-wider text-primary uppercase">
            {children}
        </span>
    );
}

function ProductPreview() {
    const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
    const slots = [
        { day: 0, start: 1, span: 2, label: 'Ana Souza', tone: 'primary' },
        { day: 1, start: 0, span: 1, label: 'Turma Pilates', tone: 'secondary' },
        { day: 1, start: 3, span: 2, label: 'Carlos Lima', tone: 'primary' },
        { day: 2, start: 2, span: 1, label: 'Avaliação', tone: 'muted' },
        { day: 3, start: 1, span: 2, label: 'Turma Pilates', tone: 'secondary' },
        { day: 4, start: 0, span: 2, label: 'Marina Reis', tone: 'primary' },
        { day: 4, start: 4, span: 1, label: 'Retorno', tone: 'muted' },
    ];

    const toneClass: Record<string, string> = {
        primary: 'bg-primary/10 text-primary border-primary/20',
        secondary: 'bg-secondary text-secondary-foreground border-secondary-foreground/20',
        muted: 'bg-muted text-muted-foreground border-border',
    };

    return (
        <div className="relative mx-auto w-full max-w-5xl">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/20 via-transparent to-secondary/40 blur-2xl" />

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10">
                {/* Window chrome */}
                <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-3">
                    <span className="size-2.5 rounded-full bg-destructive/60" />
                    <span className="size-2.5 rounded-full bg-chart-4/70" />
                    <span className="size-2.5 rounded-full bg-secondary-foreground/60" />
                    <div className="mx-auto hidden h-6 w-72 items-center justify-center rounded-md bg-background text-[11px] text-muted-foreground sm:flex">
                        app.phisio · Agenda
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]">
                    {/* Sidebar */}
                    <aside className="hidden flex-col gap-1 border-r border-border bg-sidebar p-4 md:flex">
                        <Logo className="mb-6" />
                        {[
                            { icon: CalendarRange, label: 'Agenda', active: true },
                            { icon: Users, label: 'Pacientes' },
                            { icon: Activity, label: 'Evoluções' },
                            { icon: CreditCard, label: 'Matrículas' },
                            { icon: DollarSign, label: 'Financeiro' },
                            { icon: BarChart3, label: 'Relatórios' },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
                                    item.active
                                        ? 'bg-sidebar-accent font-medium text-primary'
                                        : 'text-sidebar-foreground/70'
                                }`}
                            >
                                <item.icon className="size-4" />
                                {item.label}
                            </div>
                        ))}
                    </aside>

                    {/* Main */}
                    <div className="p-4 sm:p-6">
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-xs text-muted-foreground">Semana atual</p>
                                <h3 className="text-lg font-semibold text-foreground">Agenda da clínica</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
                                    Semana
                                </span>
                                <span className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                                    + Nova sessão
                                </span>
                            </div>
                        </div>

                        <div className="mb-5 grid grid-cols-3 gap-3">
                            {[
                                { label: 'Sessões hoje', value: '14', delta: '+3' },
                                { label: 'Ocupação', value: '86%', delta: '+5%' },
                                { label: 'A receber', value: 'R$ 4.2k', delta: '' },
                            ].map((kpi) => (
                                <div key={kpi.label} className="rounded-xl border border-border bg-background p-3">
                                    <p className="truncate text-[11px] text-muted-foreground">{kpi.label}</p>
                                    <div className="mt-1 flex items-baseline gap-1.5">
                                        <p className="text-lg font-semibold text-foreground sm:text-xl">{kpi.value}</p>
                                        {kpi.delta && (
                                            <span className="text-[11px] font-medium text-secondary-foreground">{kpi.delta}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="overflow-hidden rounded-xl border border-border">
                            <div className="grid grid-cols-5 border-b border-border bg-muted/50">
                                {days.map((d) => (
                                    <div key={d} className="py-2 text-center text-[11px] font-medium text-muted-foreground">
                                        {d}
                                    </div>
                                ))}
                            </div>
                            <div className="relative grid h-52 grid-cols-5 divide-x divide-border bg-background sm:h-60">
                                {days.map((_, col) => (
                                    <div key={col} className="relative">
                                        {slots
                                            .filter((s) => s.day === col)
                                            .map((s) => (
                                                <div
                                                    key={s.label + s.start}
                                                    className={`absolute inset-x-1 rounded-md border px-1.5 py-1 text-[10px] leading-tight font-medium ${toneClass[s.tone]}`}
                                                    style={{
                                                        top: `${s.start * 20 + 2}%`,
                                                        height: `${s.span * 20 - 4}%`,
                                                    }}
                                                >
                                                    <span className="line-clamp-2">{s.label}</span>
                                                </div>
                                            ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating cards */}
            <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="absolute -right-6 top-64 hidden w-56 rounded-xl border border-border bg-card p-3 shadow-xl lg:block"
            >
                <div className="flex items-start gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                        <CheckCircle2 className="size-4" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-foreground">Evolução registrada</p>
                        <p className="text-[11px] text-muted-foreground">Ana Souza · SOAP + 2 fotos</p>
                    </div>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="absolute -left-6 bottom-12 hidden w-56 rounded-xl border border-border bg-card p-3 shadow-xl lg:block"
            >
                <div className="flex items-start gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Bell className="size-4" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-foreground">Matrícula vence em 3 dias</p>
                        <p className="text-[11px] text-muted-foreground">Carlos Lima · Plano Mensal</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default function Welcome({ contactEmail }: Props) {
    const { auth } = usePage().props;
    const contactHref = contactEmail
        ? `mailto:${contactEmail}?subject=${encodeURIComponent('Quero conhecer o Phisio')}`
        : login().url;
    const year = new Date().getFullYear();

    return (
        <>
            <Head title="Phisio · Gestão para clínicas de fisioterapia e estúdios de Pilates" />

            <div className="relative min-h-screen bg-background text-foreground selection:bg-primary/20">
                {/* Ambient background */}
                <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[720px] overflow-hidden">
                    <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
                    <div className="absolute top-40 -right-40 h-[420px] w-[420px] rounded-full bg-secondary/50 blur-3xl" />
                    <div
                        className="absolute inset-0 opacity-[0.35]"
                        style={{
                            backgroundImage:
                                'linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)',
                            backgroundSize: '48px 48px',
                            maskImage: 'radial-gradient(ellipse at top, black 30%, transparent 75%)',
                            WebkitMaskImage: 'radial-gradient(ellipse at top, black 30%, transparent 75%)',
                        }}
                    />
                </div>

                {/* Navbar */}
                <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
                    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                        <a href="#topo" aria-label="Phisio">
                            <Logo />
                        </a>

                        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
                            <a href="#funcionalidades" className="transition-colors hover:text-foreground">
                                Funcionalidades
                            </a>
                            <a href="#como-funciona" className="transition-colors hover:text-foreground">
                                Como funciona
                            </a>
                            <a href="#seguranca" className="transition-colors hover:text-foreground">
                                Segurança
                            </a>
                            <a href="#contato" className="transition-colors hover:text-foreground">
                                Contato
                            </a>
                        </nav>

                        <div className="flex items-center gap-2">
                            {auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
                                >
                                    Acessar painel
                                    <ArrowRight className="size-4" />
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className="inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                                    >
                                        Entrar
                                    </Link>
                                    <a
                                        href={contactHref}
                                        className="hidden h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 sm:inline-flex"
                                    >
                                        Solicitar demonstração
                                    </a>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <main id="topo" className="relative z-10">
                    {/* Hero */}
                    <section className="mx-auto max-w-7xl px-6 pt-20 pb-16 md:pt-28 md:pb-24">
                        <div className="mx-auto max-w-3xl text-center">
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground shadow-xs"
                            >
                                <Sparkles className="size-3.5 text-primary" />
                                Feito para fisioterapia e Pilates clínico
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.1 }}
                                className="text-5xl font-bold tracking-tight text-balance text-foreground sm:text-6xl md:text-7xl"
                            >
                                Sua clínica organizada,{' '}
                                <span className="bg-gradient-to-r from-primary to-secondary-foreground bg-clip-text text-transparent">
                                    do agendamento ao caixa.
                                </span>
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground md:text-xl"
                            >
                                Agenda, prontuário eletrônico com evoluções SOAP, matrículas, turmas e financeiro em um só
                                sistema. Menos planilhas, mais tempo para o paciente.
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.3 }}
                                className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
                            >
                                <a
                                    href={contactHref}
                                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-7 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary/90 sm:w-auto"
                                >
                                    Solicitar demonstração
                                    <ArrowRight className="size-4" />
                                </a>
                                <Link
                                    href={login()}
                                    className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-border bg-card px-7 text-base font-semibold text-foreground shadow-xs transition-colors hover:bg-accent sm:w-auto"
                                >
                                    Já sou cliente
                                </Link>
                            </motion.div>

                            <motion.ul
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.6, delay: 0.5 }}
                                className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
                            >
                                {['Sem instalação', 'Acesso pelo celular', 'Dados protegidos pela LGPD'].map((item) => (
                                    <li key={item} className="flex items-center gap-1.5">
                                        <CheckCircle2 className="size-4 text-secondary-foreground" />
                                        {item}
                                    </li>
                                ))}
                            </motion.ul>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="mt-16 md:mt-20"
                        >
                            <ProductPreview />
                        </motion.div>
                    </section>

                    {/* Modules strip */}
                    <section className="border-y border-border bg-card/60">
                        <div className="mx-auto max-w-7xl px-6 py-8">
                            <p className="mb-5 text-center text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Tudo que a rotina de uma clínica exige
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm font-medium text-foreground/70">
                                {[
                                    { icon: CalendarRange, label: 'Agenda' },
                                    { icon: Users, label: 'Pacientes' },
                                    { icon: FileText, label: 'Evoluções' },
                                    { icon: Users, label: 'Turmas' },
                                    { icon: CreditCard, label: 'Matrículas' },
                                    { icon: DollarSign, label: 'Financeiro' },
                                    { icon: BarChart3, label: 'Relatórios' },
                                ].map((m) => (
                                    <span key={m.label} className="inline-flex items-center gap-2">
                                        <m.icon className="size-4 text-primary" />
                                        {m.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Features */}
                    <section id="funcionalidades" className="mx-auto max-w-7xl scroll-mt-20 px-6 py-24 md:py-32">
                        <Reveal className="mx-auto mb-16 max-w-2xl text-center">
                            <SectionLabel>Funcionalidades</SectionLabel>
                            <h2 className="mt-5 text-3xl font-bold tracking-tight text-balance text-foreground md:text-5xl">
                                Um sistema completo, sem excesso.
                            </h2>
                            <p className="mt-4 text-lg text-pretty text-muted-foreground">
                                Cada módulo foi desenhado a partir da rotina real de fisioterapeutas e instrutores. Nada de
                                menus que ninguém usa.
                            </p>
                        </Reveal>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            {features.map((feature, i) => (
                                <Reveal key={feature.title} delay={(i % 4) * 0.08}>
                                    <article className="group flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                                        <div
                                            className={`mb-5 inline-flex size-11 items-center justify-center rounded-xl ${
                                                feature.tone === 'primary'
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'bg-secondary text-secondary-foreground'
                                            }`}
                                        >
                                            <feature.icon className="size-5" />
                                        </div>
                                        <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                            {feature.description}
                                        </p>
                                    </article>
                                </Reveal>
                            ))}
                        </div>
                    </section>

                    {/* SOAP highlight */}
                    <section className="border-y border-border bg-card/60">
                        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-24 md:grid-cols-2 md:py-32">
                            <Reveal>
                                <SectionLabel>Prontuário eletrônico</SectionLabel>
                                <h2 className="mt-5 text-3xl font-bold tracking-tight text-balance text-foreground md:text-4xl">
                                    Evoluções clínicas que contam a história de cada paciente.
                                </h2>
                                <p className="mt-4 text-lg text-pretty text-muted-foreground">
                                    O formato SOAP guia o registro, as fotos mostram o progresso e o PDF sai pronto para
                                    enviar ao paciente ou ao médico.
                                </p>
                                <ul className="mt-8 space-y-4">
                                    {[
                                        {
                                            icon: FileText,
                                            text: 'Subjetivo, Objetivo, Avaliação e Plano em campos guiados',
                                        },
                                        { icon: Camera, text: 'Fotos de acompanhamento anexadas a cada sessão' },
                                        { icon: ClipboardList, text: 'Protocolos clínicos aplicados como ponto de partida' },
                                        { icon: Mail, text: 'Exportação em PDF com a identidade da sua clínica' },
                                    ].map((item) => (
                                        <li key={item.text} className="flex items-start gap-3">
                                            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                <item.icon className="size-4" />
                                            </span>
                                            <span className="text-foreground/90">{item.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </Reveal>

                            <Reveal delay={0.15}>
                                <div className="relative">
                                    <div className="absolute -inset-3 -z-10 rounded-3xl bg-gradient-to-br from-secondary/60 to-primary/10 blur-2xl" />
                                    <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
                                        <div className="mb-5 flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Evolução · Sessão 12</p>
                                                <p className="font-semibold text-foreground">Ana Souza</p>
                                            </div>
                                            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                                                Lombalgia crônica
                                            </span>
                                        </div>
                                        <div className="space-y-3">
                                            {[
                                                { k: 'S', label: 'Subjetivo', text: 'Relata dor 3/10 ao acordar, melhora após alongamento.' },
                                                { k: 'O', label: 'Objetivo', text: 'ADM lombar em flexão 60°. Sem irradiação. Força MMII 5/5.' },
                                                { k: 'A', label: 'Avaliação', text: 'Evolução positiva. Redução de 40% na dor desde a avaliação.' },
                                                { k: 'P', label: 'Plano', text: 'Progredir carga em prancha. Reforço de core. Retorno em 7 dias.' },
                                            ].map((row) => (
                                                <div key={row.k} className="flex gap-3 rounded-xl border border-border bg-background p-3">
                                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                                                        {row.k}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                                            {row.label}
                                                        </p>
                                                        <p className="text-sm text-foreground/90">{row.text}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-4 flex items-center gap-2">
                                            {[0, 1].map((i) => (
                                                <div
                                                    key={i}
                                                    className="flex size-14 items-center justify-center rounded-lg border border-dashed border-border bg-muted text-muted-foreground"
                                                >
                                                    <Camera className="size-4" />
                                                </div>
                                            ))}
                                            <span className="ml-auto text-xs text-muted-foreground">2 fotos anexadas</span>
                                        </div>
                                    </div>
                                </div>
                            </Reveal>
                        </div>
                    </section>

                    {/* How it works */}
                    <section id="como-funciona" className="mx-auto max-w-7xl scroll-mt-20 px-6 py-24 md:py-32">
                        <Reveal className="mx-auto mb-16 max-w-2xl text-center">
                            <SectionLabel>Como funciona</SectionLabel>
                            <h2 className="mt-5 text-3xl font-bold tracking-tight text-balance text-foreground md:text-5xl">
                                Do primeiro contato ao acompanhamento.
                            </h2>
                            <p className="mt-4 text-lg text-pretty text-muted-foreground">
                                Um fluxo simples que conecta recepção, atendimento e gestão sem retrabalho.
                            </p>
                        </Reveal>

                        <div className="relative grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                            <div className="absolute top-7 left-[12.5%] right-[12.5%] hidden border-t border-dashed border-border lg:block" />
                            {steps.map((s, i) => (
                                <Reveal key={s.step} delay={i * 0.1} className="relative">
                                    <div className="relative z-10 mb-5 inline-flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-background text-lg font-bold text-primary shadow-xs">
                                        {s.step}
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground">{s.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
                                </Reveal>
                            ))}
                        </div>
                    </section>

                    {/* Trust */}
                    <section id="seguranca" className="scroll-mt-20 border-y border-border bg-card/60">
                        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
                            <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:items-center">
                                <Reveal>
                                    <SectionLabel>Segurança e confiança</SectionLabel>
                                    <h2 className="mt-5 text-3xl font-bold tracking-tight text-balance text-foreground md:text-4xl">
                                        Dados clínicos exigem cuidado. Nós levamos a sério.
                                    </h2>
                                    <p className="mt-4 text-lg text-pretty text-muted-foreground">
                                        Cada clínica opera em um ambiente isolado, com controle granular de permissões e
                                        camadas extras de proteção no acesso.
                                    </p>
                                </Reveal>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {trust.map((t, i) => (
                                        <Reveal key={t.title} delay={i * 0.08}>
                                            <div className="flex h-full gap-4 rounded-2xl border border-border bg-card p-5">
                                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                                                    <t.icon className="size-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-foreground">{t.title}</h3>
                                                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                                        {t.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </Reveal>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* CTA */}
                    <section id="contato" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24 md:py-32">
                        <Reveal>
                            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-secondary-foreground p-10 text-primary-foreground shadow-2xl shadow-primary/30 md:p-16">
                                <div className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-white/10 blur-3xl" />
                                <div className="pointer-events-none absolute -bottom-32 -left-16 size-80 rounded-full bg-white/10 blur-3xl" />
                                <div className="relative grid items-center gap-10 md:grid-cols-[1.4fr_1fr]">
                                    <div>
                                        <h2 className="text-3xl font-bold tracking-tight text-balance md:text-5xl">
                                            Pronto para modernizar sua clínica?
                                        </h2>
                                        <p className="mt-4 max-w-xl text-lg text-pretty text-primary-foreground/80">
                                            Agende uma demonstração guiada. Mostramos o Phisio funcionando com o fluxo da sua
                                            clínica e respondemos todas as suas dúvidas.
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <a
                                            href={contactHref}
                                            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-primary shadow-lg transition-transform hover:-translate-y-0.5"
                                        >
                                            <Mail className="size-4" />
                                            Solicitar demonstração
                                        </a>
                                        <Link
                                            href={login()}
                                            className="inline-flex h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 text-base font-semibold text-primary-foreground backdrop-blur transition-colors hover:bg-white/20"
                                        >
                                            Já sou cliente
                                        </Link>
                                        {contactEmail && (
                                            <p className="text-center text-sm text-primary-foreground/70">{contactEmail}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Reveal>
                    </section>
                </main>

                {/* Footer */}
                <footer className="border-t border-border bg-card/60">
                    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-10 md:flex-row">
                        <Logo />
                        <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                            <a href="#funcionalidades" className="hover:text-foreground">
                                Funcionalidades
                            </a>
                            <a href="#como-funciona" className="hover:text-foreground">
                                Como funciona
                            </a>
                            <a href="#seguranca" className="hover:text-foreground">
                                Segurança
                            </a>
                            <Link href={login()} className="hover:text-foreground">
                                Entrar
                            </Link>
                        </nav>
                        <p className="text-sm text-muted-foreground">© {year} Phisio. Todos os direitos reservados.</p>
                    </div>
                </footer>
            </div>
        </>
    );
}
