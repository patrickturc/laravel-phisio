import { Head, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    Users,
    Calendar,
    FileText,
    TrendingUp,
    Award,
    Download,
    Filter,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Relatórios', href: '/reports' },
];

interface Stats {
    totalPatients: number;
    pilatesCount: number;
    physioCount: number;
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    totalEvolutions: number;
    completionRate: number;
}

interface MonthData {
    month: string;
    total: number;
    completed?: number;
    cancelled?: number;
    scheduled?: number;
}

interface TopPatient {
    id: string;
    name: string;
    type: string;
    appointments_count: number;
}

interface Props {
    stats: Stats;
    appointmentsPerMonth: MonthData[];
    evolutionsPerMonth: MonthData[];
    topPatients: TopPatient[];
    filters: {
        start_date: string | null;
        end_date: string | null;
    };
}

const monthLabels: Record<string, string> = {
    '01': 'Jan',
    '02': 'Fev',
    '03': 'Mar',
    '04': 'Abr',
    '05': 'Mai',
    '06': 'Jun',
    '07': 'Jul',
    '08': 'Ago',
    '09': 'Set',
    '10': 'Out',
    '11': 'Nov',
    '12': 'Dez',
};

function BarChart({ data, label }: { data: MonthData[]; label: string }) {
    const maxVal = Math.max(...data.map((d) => d.total), 1);
    return (
        <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                {label}
            </h3>
            <div className="flex h-40 items-end gap-2">
                {data.map((d, i) => {
                    const month = d.month.split('-')[1];
                    const height = (d.total / maxVal) * 100;
                    return (
                        <div
                            key={i}
                            className="flex flex-1 flex-col items-center gap-1"
                        >
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${height}%` }}
                                transition={{
                                    delay: i * 0.05,
                                    type: 'spring',
                                    stiffness: 100,
                                }}
                                className="group relative min-h-[4px] w-full rounded-t-lg bg-gradient-to-t from-primary to-emerald-400"
                            >
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-md bg-foreground px-2 py-0.5 text-xs whitespace-nowrap text-background opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                                    {d.total}
                                </div>
                            </motion.div>
                            <span className="text-[10px] font-medium text-muted-foreground">
                                {monthLabels[month] || month}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function ReportsIndex({
    stats,
    appointmentsPerMonth,
    evolutionsPerMonth,
    topPatients,
    filters,
}: Props) {
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');

    const kpis = [
        {
            label: 'Total Pacientes',
            value: stats.totalPatients,
            icon: Users,
            color: 'from-primary to-blue-500',
            bg: 'bg-primary/10',
            textColor: 'text-primary',
        },
        {
            label: 'Total Agendamentos',
            value: stats.totalAppointments,
            icon: Calendar,
            color: 'from-emerald-500 to-teal-500',
            bg: 'bg-emerald-500/10',
            textColor: 'text-emerald-600',
        },
        {
            label: 'Total Evoluções',
            value: stats.totalEvolutions,
            icon: FileText,
            color: 'from-indigo-500 to-purple-500',
            bg: 'bg-indigo-500/10',
            textColor: 'text-indigo-600',
        },
        {
            label: 'Taxa de Conclusão',
            value: `${stats.completionRate}%`,
            icon: TrendingUp,
            color: 'from-amber-500 to-orange-500',
            bg: 'bg-amber-500/10',
            textColor: 'text-amber-600',
        },
    ];

    const applyFilters = () => {
        router.get(
            '/reports',
            { start_date: startDate, end_date: endDate },
            { preserveState: true },
        );
    };

    const clearFilters = () => {
        setStartDate('');
        setEndDate('');
        router.get('/reports', {}, { preserveState: true });
    };

    const exportPdfUrl = `/reports/pdf?start_date=${startDate}&end_date=${endDate}`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Relatórios - Phisio" />

            <div className="mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-6 p-6 md:p-10">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h1 className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                            Relatórios
                        </h1>
                        <p className="mt-1 text-muted-foreground">
                            Visão geral do desempenho do seu estúdio.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/50 bg-card/60 p-2 shadow-sm backdrop-blur-xl">
                        <div className="flex items-center gap-2">
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-9 w-[130px] border-none bg-background text-sm"
                            />
                            <span className="text-sm text-muted-foreground">
                                até
                            </span>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="h-9 w-[130px] border-none bg-background text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2 border-l border-border/50 pl-3">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={applyFilters}
                                className="h-9 gap-1.5"
                            >
                                <Filter className="size-3.5" /> Filtrar
                            </Button>
                            {(startDate || endDate) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="h-9 text-muted-foreground"
                                >
                                    Limpar
                                </Button>
                            )}
                            <a
                                href={exportPdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-1 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-emerald-500 to-teal-600 px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
                            >
                                <Download className="size-4" /> PDF
                            </a>
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {kpis.map((kpi, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm backdrop-blur-xl"
                        >
                            <div className="mb-3 flex items-center gap-3">
                                <div className={`rounded-xl p-2.5 ${kpi.bg}`}>
                                    <kpi.icon
                                        className={`size-5 ${kpi.textColor}`}
                                    />
                                </div>
                                <span className="text-sm font-medium text-muted-foreground">
                                    {kpi.label}
                                </span>
                            </div>
                            <p className="text-3xl font-bold tracking-tight text-foreground">
                                {kpi.value}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl"
                    >
                        <BarChart
                            data={appointmentsPerMonth}
                            label="Agendamentos por Mês"
                        />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl"
                    >
                        <BarChart
                            data={evolutionsPerMonth}
                            label="Evoluções por Mês"
                        />
                    </motion.div>
                </div>

                {/* Bottom Row */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Patients by type */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl"
                    >
                        <h3 className="mb-4 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                            Pacientes por Tipo
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="mb-1 flex justify-between text-sm">
                                    <span className="font-medium">Pilates</span>
                                    <span className="text-muted-foreground">
                                        {stats.pilatesCount}
                                    </span>
                                </div>
                                <div className="h-3 w-full overflow-hidden rounded-full bg-muted/50">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: `${stats.totalPatients > 0 ? (stats.pilatesCount / stats.totalPatients) * 100 : 0}%`,
                                        }}
                                        transition={{
                                            delay: 0.5,
                                            duration: 0.8,
                                        }}
                                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="mb-1 flex justify-between text-sm">
                                    <span className="font-medium">
                                        Fisioterapia
                                    </span>
                                    <span className="text-muted-foreground">
                                        {stats.physioCount}
                                    </span>
                                </div>
                                <div className="h-3 w-full overflow-hidden rounded-full bg-muted/50">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: `${stats.totalPatients > 0 ? (stats.physioCount / stats.totalPatients) * 100 : 0}%`,
                                        }}
                                        transition={{
                                            delay: 0.6,
                                            duration: 0.8,
                                        }}
                                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center gap-4 border-t border-border/30 pt-4">
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-2xl font-bold text-foreground">
                                    {stats.completedAppointments}
                                </span>
                                <span className="text-muted-foreground">
                                    realizados
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-2xl font-bold text-red-500">
                                    {stats.cancelledAppointments}
                                </span>
                                <span className="text-muted-foreground">
                                    cancelados
                                </span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Top patients */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl"
                    >
                        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                            <Award className="size-4 text-amber-500" />{' '}
                            Pacientes Mais Frequentes
                        </h3>
                        <div className="space-y-3">
                            {topPatients.map((patient, i) => (
                                <div
                                    key={patient.id}
                                    className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted/30"
                                >
                                    <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-emerald-500/10 text-sm font-bold text-primary">
                                        {i + 1}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold">
                                            {patient.name}
                                        </p>
                                        <span
                                            className={`text-xs font-medium ${patient.type === 'pilates' ? 'text-indigo-600' : 'text-emerald-600'}`}
                                        >
                                            {patient.type === 'pilates'
                                                ? 'Pilates'
                                                : 'Fisioterapia'}
                                        </span>
                                    </div>
                                    <span className="text-sm font-bold text-muted-foreground">
                                        {patient.appointments_count} sessões
                                    </span>
                                </div>
                            ))}
                            {topPatients.length === 0 && (
                                <p className="py-4 text-center text-sm text-muted-foreground">
                                    Nenhum dado disponível.
                                </p>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </AppLayout>
    );
}
