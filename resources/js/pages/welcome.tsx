import { Head, Link, usePage } from '@inertiajs/react';
import type { MotionValue } from 'framer-motion';
import {
    motion,
    useAnimationFrame,
    useMotionValue,
    useReducedMotion,
    useScroll,
    useSpring,
    useTransform,
    useVelocity,
    wrap,
} from 'framer-motion';
import {
    Activity,
    ArrowRight,
    BarChart3,
    Bell,
    CalendarRange,
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
import type { ComponentType, MouseEvent, ReactNode } from 'react';
import { useRef } from 'react';
import { dashboard, login } from '@/routes';

type Props = {
    contactEmail: string | null;
    canRegister: boolean;
    trialDays: number;
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
            'Registre Subjetivo, Objetivo, Avaliação e Plano em campos guiados, com exportação em PDF.',
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

const modules = [
    { icon: CalendarRange, label: 'Agenda' },
    { icon: Users, label: 'Pacientes' },
    { icon: FileText, label: 'Evoluções' },
    { icon: Users, label: 'Turmas' },
    { icon: CreditCard, label: 'Matrículas' },
    { icon: DollarSign, label: 'Financeiro' },
    { icon: BarChart3, label: 'Relatórios' },
];

const steps = [
    {
        step: '01',
        title: 'Cadastre seus pacientes',
        description:
            'Importe ou cadastre pacientes com dados clínicos, documentos e plano contratado.',
    },
    {
        step: '02',
        title: 'Monte a agenda',
        description:
            'Defina horários, duração das sessões e turmas. Confirmações e faltas ficam registradas.',
    },
    {
        step: '03',
        title: 'Registre cada atendimento',
        description:
            'Evolução SOAP ao final da sessão. O financeiro é atualizado automaticamente.',
    },
    {
        step: '04',
        title: 'Acompanhe os resultados',
        description:
            'Relatórios de ocupação, receita e frequência mostram a saúde da clínica em tempo real.',
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
        description:
            'Dados isolados por clínica, com exportação completa sob demanda.',
    },
    {
        icon: RefreshCw,
        title: 'Sincronização de calendário',
        description:
            'Sua agenda no Google Calendar, Apple ou Outlook via feed iCal.',
    },
    {
        icon: Smartphone,
        title: 'Funciona como aplicativo',
        description:
            'Instale no celular ou tablet e use na recepção ou na sala de atendimento.',
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

/**
 * Scroll-scrubbed 3D reveal: the panel starts tilted back and slightly small,
 * then straightens and settles as it rises through the viewport. The rotation
 * is tied to scroll position rather than to time, so dragging the scrollbar
 * backwards plays it in reverse.
 */
function ScrollTiltPanel({ children }: { children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const reduceMotion = useReducedMotion();

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start end', 'center center'],
    });

    // A spring takes the jitter out of raw wheel/trackpad deltas.
    const progress = useSpring(scrollYProgress, {
        stiffness: 110,
        damping: 28,
        mass: 0.4,
    });

    const rotateX = useTransform(progress, [0, 1], [20, 0]);
    const scale = useTransform(progress, [0, 1], [0.86, 1]);
    const opacity = useTransform(progress, [0, 0.5], [0.45, 1]);
    const translateY = useTransform(progress, [0, 1], [60, 0]);

    if (reduceMotion) {
        return <div ref={ref}>{children}</div>;
    }

    return (
        <div ref={ref} style={{ perspective: 1600 }}>
            <motion.div
                style={{
                    rotateX,
                    scale,
                    opacity,
                    y: translateY,
                    transformOrigin: 'center top',
                }}
                className="will-change-transform"
            >
                {children}
            </motion.div>
        </div>
    );
}

function RevealWord({
    progress,
    range,
    children,
}: {
    progress: MotionValue<number>;
    range: [number, number];
    children: string;
}) {
    const opacity = useTransform(progress, range, [0.12, 1]);
    const y = useTransform(progress, range, [8, 0]);

    return (
        <motion.span
            style={{ opacity, y }}
            className="mr-[0.25em] inline-block"
        >
            {children}
        </motion.span>
    );
}

/**
 * Word-by-word scroll reveal. Each word gets its own slice of the scroll range,
 * so the sentence brightens left to right as the section comes up — the effect
 * Apple uses for its statement lines.
 */
function ScrollRevealText({
    text,
    className,
}: {
    text: string;
    className?: string;
}) {
    const ref = useRef<HTMLParagraphElement>(null);
    const reduceMotion = useReducedMotion();

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start 0.9', 'start 0.35'],
    });

    const words = text.split(' ');

    if (reduceMotion) {
        return <p className={className}>{text}</p>;
    }

    return (
        <p ref={ref} className={className}>
            {words.map((word, i) => (
                <RevealWord
                    key={`${word}-${i}`}
                    progress={scrollYProgress}
                    range={[i / words.length, (i + 1) / words.length]}
                >
                    {word}
                </RevealWord>
            ))}
        </p>
    );
}

/**
 * Infinite marquee wired to scroll velocity. It drifts on its own, speeds up
 * while the page is being scrolled and flips direction when the reader scrolls
 * back up, so the strip feels physically linked to the wheel.
 */
function VelocityMarquee({
    children,
    baseVelocity = 2.4,
}: {
    children: ReactNode;
    baseVelocity?: number;
}) {
    const reduceMotion = useReducedMotion();
    const baseX = useMotionValue(0);
    const { scrollY } = useScroll();
    const scrollVelocity = useVelocity(scrollY);
    const smoothVelocity = useSpring(scrollVelocity, {
        damping: 50,
        stiffness: 400,
    });

    // clamp:false lets a hard flick push the strip well past its idle speed.
    const velocityFactor = useTransform(smoothVelocity, [0, 1200], [0, 4], {
        clamp: false,
    });

    // The track carries four identical copies, so wrapping a quarter of its
    // width lands the next copy exactly where the previous one was.
    const x = useTransform(baseX, (value) => `${wrap(-25, 0, value)}%`);
    const direction = useRef(-1);

    useAnimationFrame((_, delta) => {
        if (reduceMotion) {
            return;
        }

        const factor = velocityFactor.get();

        if (factor > 0) {
            direction.current = -1;
        } else if (factor < 0) {
            direction.current = 1;
        }

        let moveBy = direction.current * baseVelocity * (delta / 1000);
        moveBy += moveBy * Math.abs(factor);

        baseX.set(baseX.get() + moveBy);
    });

    if (reduceMotion) {
        return (
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
                {children}
            </div>
        );
    }

    return (
        <div
            className="overflow-hidden"
            style={{
                maskImage:
                    'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
                WebkitMaskImage:
                    'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
            }}
        >
            <motion.div className="flex will-change-transform" style={{ x }}>
                {[0, 1, 2, 3].map((copy) => (
                    <div
                        key={copy}
                        aria-hidden={copy > 0}
                        className="flex shrink-0 items-center gap-x-10 pr-10"
                    >
                        {children}
                    </div>
                ))}
            </motion.div>
        </div>
    );
}

/**
 * Cursor-tracked spotlight. The pointer position is written to CSS custom
 * properties on the card, which two radial gradients read: one lights the rim,
 * the other washes across the face. Cheap enough to run on every card because
 * nothing re-renders — only the custom properties change.
 */
function SpotlightCard({ children }: { children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const reduceMotion = useReducedMotion();

    const handleMove = (event: MouseEvent<HTMLDivElement>) => {
        const element = ref.current;

        if (!element) {
            return;
        }

        const rect = element.getBoundingClientRect();
        element.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
        element.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
    };

    if (reduceMotion) {
        return <div className="h-full">{children}</div>;
    }

    return (
        <div
            ref={ref}
            onMouseMove={handleMove}
            className="group/spot relative h-full"
        >
            <div
                aria-hidden
                className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 blur-[1px] transition-opacity duration-300 group-hover/spot:opacity-70"
                style={{
                    background:
                        'radial-gradient(180px circle at var(--spot-x, 50%) var(--spot-y, 50%), var(--color-primary), transparent 70%)',
                }}
            />
            <div className="relative h-full transition-transform duration-300 group-hover/spot:-translate-y-1">
                {children}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
                    style={{
                        background:
                            'radial-gradient(240px circle at var(--spot-x, 50%) var(--spot-y, 50%), color-mix(in oklab, var(--color-primary) 12%, transparent), transparent 70%)',
                    }}
                />
            </div>
        </div>
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
        {
            day: 1,
            start: 0,
            span: 1,
            label: 'Turma Pilates',
            tone: 'secondary',
        },
        { day: 1, start: 3, span: 2, label: 'Carlos Lima', tone: 'primary' },
        { day: 2, start: 2, span: 1, label: 'Avaliação', tone: 'muted' },
        {
            day: 3,
            start: 1,
            span: 2,
            label: 'Turma Pilates',
            tone: 'secondary',
        },
        { day: 4, start: 0, span: 2, label: 'Marina Reis', tone: 'primary' },
        { day: 4, start: 4, span: 1, label: 'Retorno', tone: 'muted' },
    ];

    const toneClass: Record<string, string> = {
        primary: 'bg-primary/10 text-primary border-primary/20',
        secondary:
            'bg-secondary text-secondary-foreground border-secondary-foreground/20',
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
                            {
                                icon: CalendarRange,
                                label: 'Agenda',
                                active: true,
                            },
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
                                <p className="text-xs text-muted-foreground">
                                    Semana atual
                                </p>
                                <h3 className="text-lg font-semibold text-foreground">
                                    Agenda da clínica
                                </h3>
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
                                {
                                    label: 'Sessões hoje',
                                    value: '14',
                                    delta: '+3',
                                },
                                {
                                    label: 'Ocupação',
                                    value: '86%',
                                    delta: '+5%',
                                },
                                {
                                    label: 'A receber',
                                    value: 'R$ 4.2k',
                                    delta: '',
                                },
                            ].map((kpi) => (
                                <div
                                    key={kpi.label}
                                    className="rounded-xl border border-border bg-background p-3"
                                >
                                    <p className="truncate text-[11px] text-muted-foreground">
                                        {kpi.label}
                                    </p>
                                    <div className="mt-1 flex items-baseline gap-1.5">
                                        <p className="text-lg font-semibold text-foreground sm:text-xl">
                                            {kpi.value}
                                        </p>
                                        {kpi.delta && (
                                            <span className="text-[11px] font-medium text-secondary-foreground">
                                                {kpi.delta}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="overflow-hidden rounded-xl border border-border">
                            <div className="grid grid-cols-5 border-b border-border bg-muted/50">
                                {days.map((d) => (
                                    <div
                                        key={d}
                                        className="py-2 text-center text-[11px] font-medium text-muted-foreground"
                                    >
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
                                                    <span className="line-clamp-2">
                                                        {s.label}
                                                    </span>
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
                className="absolute top-64 -right-6 hidden w-56 rounded-xl border border-border bg-card p-3 shadow-xl lg:block"
            >
                <div className="flex items-start gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                        <CheckCircle2 className="size-4" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-foreground">
                            Evolução registrada
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                            Ana Souza · Sessão 12
                        </p>
                    </div>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="absolute bottom-12 -left-6 hidden w-56 rounded-xl border border-border bg-card p-3 shadow-xl lg:block"
            >
                <div className="flex items-start gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Bell className="size-4" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-foreground">
                            Matrícula vence em 3 dias
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                            Carlos Lima · Plano Mensal
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default function Welcome({
    contactEmail,
    canRegister = true,
    trialDays = 15,
}: Props) {
    const { auth } = usePage().props;
    const contactHref = contactEmail
        ? `mailto:${contactEmail}?subject=${encodeURIComponent('Quero conhecer o Phisio')}`
        : login().url;
    // The trial signup is the primary call to action; when self-service signup
    // is turned off the same buttons fall back to contacting the team.
    const signupHref = canRegister ? '/register' : contactHref;
    const signupLabel = canRegister
        ? `Teste grátis por ${trialDays} dias`
        : 'Solicitar demonstração';
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
                            maskImage:
                                'radial-gradient(ellipse at top, black 30%, transparent 75%)',
                            WebkitMaskImage:
                                'radial-gradient(ellipse at top, black 30%, transparent 75%)',
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
                            <a
                                href="#funcionalidades"
                                className="transition-colors hover:text-foreground"
                            >
                                Funcionalidades
                            </a>
                            <a
                                href="#como-funciona"
                                className="transition-colors hover:text-foreground"
                            >
                                Como funciona
                            </a>
                            <a
                                href="#seguranca"
                                className="transition-colors hover:text-foreground"
                            >
                                Segurança
                            </a>
                            <a
                                href="#contato"
                                className="transition-colors hover:text-foreground"
                            >
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
                                        href={signupHref}
                                        className="hidden h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 sm:inline-flex"
                                    >
                                        {canRegister
                                            ? 'Criar conta grátis'
                                            : 'Solicitar demonstração'}
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
                                {canRegister
                                    ? `${trialDays} dias grátis para testar tudo`
                                    : 'Feito para fisioterapia e Pilates clínico'}
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
                                Agenda, prontuário eletrônico com evoluções
                                SOAP, matrículas, turmas e financeiro em um só
                                sistema. Menos planilhas, mais tempo para o
                                paciente.
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.3 }}
                                className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
                            >
                                <a
                                    href={signupHref}
                                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-7 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary/90 sm:w-auto"
                                >
                                    {signupLabel}
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
                                {[
                                    'Sem cartão de crédito',
                                    'Acesso completo no teste',
                                    'Dados protegidos pela LGPD',
                                ].map((item) => (
                                    <li
                                        key={item}
                                        className="flex items-center gap-1.5"
                                    >
                                        <CheckCircle2 className="size-4 text-secondary-foreground" />
                                        {item}
                                    </li>
                                ))}
                            </motion.ul>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: 0.8,
                                delay: 0.4,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                            className="mt-16 md:mt-20"
                        >
                            <ScrollTiltPanel>
                                <ProductPreview />
                            </ScrollTiltPanel>
                        </motion.div>
                    </section>

                    {/* Modules strip */}
                    <section className="border-y border-border bg-card/60">
                        <div className="mx-auto max-w-7xl px-6 py-8">
                            <p className="mb-5 text-center text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Tudo que a rotina de uma clínica exige
                            </p>
                            <VelocityMarquee>
                                {modules.map((m) => (
                                    <span
                                        key={m.label}
                                        className="inline-flex items-center gap-2 text-sm font-medium whitespace-nowrap text-foreground/70"
                                    >
                                        <m.icon className="size-4 text-primary" />
                                        {m.label}
                                    </span>
                                ))}
                            </VelocityMarquee>
                        </div>
                    </section>

                    {/* Features */}
                    <section
                        id="funcionalidades"
                        className="mx-auto max-w-7xl scroll-mt-20 px-6 py-24 md:py-32"
                    >
                        <Reveal className="mx-auto mb-16 max-w-2xl text-center">
                            <SectionLabel>Funcionalidades</SectionLabel>
                            <h2 className="mt-5 text-3xl font-bold tracking-tight text-balance text-foreground md:text-5xl">
                                Um sistema completo, sem excesso.
                            </h2>
                            <p className="mt-4 text-lg text-pretty text-muted-foreground">
                                Cada módulo foi desenhado a partir da rotina
                                real de fisioterapeutas e instrutores. Nada de
                                menus que ninguém usa.
                            </p>
                        </Reveal>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            {features.map((feature, i) => (
                                <Reveal
                                    key={feature.title}
                                    delay={(i % 4) * 0.08}
                                >
                                    <SpotlightCard>
                                        <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-colors duration-300 group-hover/spot:border-primary/30">
                                            <div
                                                className={`mb-5 inline-flex size-11 items-center justify-center rounded-xl ${
                                                    feature.tone === 'primary'
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'bg-secondary text-secondary-foreground'
                                                }`}
                                            >
                                                <feature.icon className="size-5" />
                                            </div>
                                            <h3 className="text-base font-semibold text-foreground">
                                                {feature.title}
                                            </h3>
                                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                                {feature.description}
                                            </p>
                                        </article>
                                    </SpotlightCard>
                                </Reveal>
                            ))}
                        </div>
                    </section>

                    {/* SOAP highlight */}
                    <section className="border-y border-border bg-card/60">
                        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-24 md:grid-cols-2 md:py-32">
                            <Reveal>
                                <SectionLabel>
                                    Prontuário eletrônico
                                </SectionLabel>
                                <h2 className="mt-5 text-3xl font-bold tracking-tight text-balance text-foreground md:text-4xl">
                                    Evoluções clínicas que contam a história de
                                    cada paciente.
                                </h2>
                                <p className="mt-4 text-lg text-pretty text-muted-foreground">
                                    O formato SOAP guia o registro e o PDF sai
                                    pronto para enviar ao paciente ou ao médico.
                                </p>
                                <ul className="mt-8 space-y-4">
                                    {[
                                        {
                                            icon: FileText,
                                            text: 'Subjetivo, Objetivo, Avaliação e Plano em campos guiados',
                                        },
                                        {
                                            icon: ClipboardList,
                                            text: 'Histórico completo de sessões por paciente',
                                        },
                                        {
                                            icon: ClipboardList,
                                            text: 'Protocolos clínicos aplicados como ponto de partida',
                                        },
                                        {
                                            icon: Mail,
                                            text: 'Exportação em PDF com a identidade da sua clínica',
                                        },
                                    ].map((item) => (
                                        <li
                                            key={item.text}
                                            className="flex items-start gap-3"
                                        >
                                            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                <item.icon className="size-4" />
                                            </span>
                                            <span className="text-foreground/90">
                                                {item.text}
                                            </span>
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
                                                <p className="text-xs text-muted-foreground">
                                                    Evolução · Sessão 12
                                                </p>
                                                <p className="font-semibold text-foreground">
                                                    Ana Souza
                                                </p>
                                            </div>
                                            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                                                Lombalgia crônica
                                            </span>
                                        </div>
                                        <div className="space-y-3">
                                            {[
                                                {
                                                    k: 'S',
                                                    label: 'Subjetivo',
                                                    text: 'Relata dor 3/10 ao acordar, melhora após alongamento.',
                                                },
                                                {
                                                    k: 'O',
                                                    label: 'Objetivo',
                                                    text: 'ADM lombar em flexão 60°. Sem irradiação. Força MMII 5/5.',
                                                },
                                                {
                                                    k: 'A',
                                                    label: 'Avaliação',
                                                    text: 'Evolução positiva. Redução de 40% na dor desde a avaliação.',
                                                },
                                                {
                                                    k: 'P',
                                                    label: 'Plano',
                                                    text: 'Progredir carga em prancha. Reforço de core. Retorno em 7 dias.',
                                                },
                                            ].map((row) => (
                                                <div
                                                    key={row.k}
                                                    className="flex gap-3 rounded-xl border border-border bg-background p-3"
                                                >
                                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                                                        {row.k}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                                            {row.label}
                                                        </p>
                                                        <p className="text-sm text-foreground/90">
                                                            {row.text}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                                            <span className="text-xs text-muted-foreground">
                                                Registrada por Maria Fisio
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                                <FileText className="size-3.5" />
                                                Exportar PDF
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Reveal>
                        </div>
                    </section>

                    {/* How it works */}
                    <section
                        id="como-funciona"
                        className="mx-auto max-w-7xl scroll-mt-20 px-6 py-24 md:py-32"
                    >
                        <div className="mx-auto mb-16 max-w-3xl text-center">
                            <Reveal>
                                <SectionLabel>Como funciona</SectionLabel>
                            </Reveal>
                            <ScrollRevealText
                                text="Do primeiro contato ao acompanhamento, sem retrabalho."
                                className="mt-5 text-3xl font-bold tracking-tight text-balance text-foreground md:text-5xl"
                            />
                            <Reveal>
                                <p className="mt-4 text-lg text-pretty text-muted-foreground">
                                    Um fluxo simples que conecta recepção,
                                    atendimento e gestão.
                                </p>
                            </Reveal>
                        </div>

                        <div className="relative grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                            <div className="absolute top-7 right-[12.5%] left-[12.5%] hidden border-t border-dashed border-border lg:block" />
                            {steps.map((s, i) => (
                                <Reveal
                                    key={s.step}
                                    delay={i * 0.1}
                                    className="relative"
                                >
                                    <div className="relative z-10 mb-5 inline-flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-background text-lg font-bold text-primary shadow-xs">
                                        {s.step}
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground">
                                        {s.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                        {s.description}
                                    </p>
                                </Reveal>
                            ))}
                        </div>
                    </section>

                    {/* Trust */}
                    <section
                        id="seguranca"
                        className="scroll-mt-20 border-y border-border bg-card/60"
                    >
                        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
                            <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:items-center">
                                <Reveal>
                                    <SectionLabel>
                                        Segurança e confiança
                                    </SectionLabel>
                                    <h2 className="mt-5 text-3xl font-bold tracking-tight text-balance text-foreground md:text-4xl">
                                        Dados clínicos exigem cuidado. Nós
                                        levamos a sério.
                                    </h2>
                                    <p className="mt-4 text-lg text-pretty text-muted-foreground">
                                        Cada clínica opera em um ambiente
                                        isolado, com controle granular de
                                        permissões e camadas extras de proteção
                                        no acesso.
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
                                                    <h3 className="font-semibold text-foreground">
                                                        {t.title}
                                                    </h3>
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
                    <section
                        id="contato"
                        className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24 md:py-32"
                    >
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
                                            {canRegister
                                                ? `Crie sua conta em menos de um minuto e use o sistema completo por ${trialDays} dias. Sem cartão de crédito, sem compromisso.`
                                                : 'Agende uma demonstração guiada. Mostramos o Phisio funcionando com o fluxo da sua clínica e respondemos todas as suas dúvidas.'}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <a
                                            href={signupHref}
                                            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-primary shadow-lg transition-transform hover:-translate-y-0.5"
                                        >
                                            {canRegister ? (
                                                <Sparkles className="size-4" />
                                            ) : (
                                                <Mail className="size-4" />
                                            )}
                                            {signupLabel}
                                        </a>
                                        <Link
                                            href={login()}
                                            className="inline-flex h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 text-base font-semibold text-primary-foreground backdrop-blur transition-colors hover:bg-white/20"
                                        >
                                            Já sou cliente
                                        </Link>
                                        {contactEmail && canRegister && (
                                            <a
                                                href={contactHref}
                                                className="inline-flex items-center justify-center gap-1.5 text-center text-sm text-primary-foreground/80 underline-offset-4 hover:underline"
                                            >
                                                <Mail className="size-4" />
                                                Prefere uma demonstração guiada?
                                                Fale com a equipe
                                            </a>
                                        )}
                                        {contactEmail && !canRegister && (
                                            <p className="text-center text-sm text-primary-foreground/70">
                                                {contactEmail}
                                            </p>
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
                            <a
                                href="#funcionalidades"
                                className="hover:text-foreground"
                            >
                                Funcionalidades
                            </a>
                            <a
                                href="#como-funciona"
                                className="hover:text-foreground"
                            >
                                Como funciona
                            </a>
                            <a
                                href="#seguranca"
                                className="hover:text-foreground"
                            >
                                Segurança
                            </a>
                            <Link
                                href={login()}
                                className="hover:text-foreground"
                            >
                                Entrar
                            </Link>
                        </nav>
                        <p className="text-sm text-muted-foreground">
                            © {year} Phisio. Todos os direitos reservados.
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
