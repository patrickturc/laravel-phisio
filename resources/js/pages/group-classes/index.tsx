import { Head, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Users, Plus, Search, Calendar, CalendarClock } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { GroupClassFormSheet } from './group-class-form-sheet';

export default function GroupClassesIndex({
    groupClasses,
    patients = [],
    users = [],
}: {
    groupClasses: any[];
    patients?: any[];
    users?: any[];
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Turmas', href: '/group-classes' },
    ];

    const { can } = usePermissions();
    const [search, setSearch] = useState('');
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const filteredClasses = groupClasses.filter((gc) =>
        gc.name.toLowerCase().includes(search.toLowerCase()),
    );

    const formatDays = (schedules: any[]) => {
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        if (!schedules || schedules.length === 0) return 'Sem horário definido';

        return schedules
            .map(
                (s) => `${days[s.day_of_week]} ${s.start_time.substring(0, 5)}`,
            )
            .join(', ');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Turmas" />
            <div className="mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-6 p-6 md:p-10">
                {/* Header Actions */}
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="relative w-full sm:max-w-md">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar turmas..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-border bg-card py-2 pr-4 pl-10 text-sm transition-all focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        />
                    </div>
                    {can('group_classes.manage.create') && (
                        <Button
                            onClick={() => setIsSheetOpen(true)}
                            className="w-full gap-2 rounded-xl font-medium shadow-sm sm:w-auto"
                        >
                            <Plus className="size-4" /> Nova Turma
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredClasses.map((groupClass, index) => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            key={groupClass.id}
                        >
                            <Link
                                href={`/group-classes/${groupClass.id}`}
                                className="block h-full"
                            >
                                <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
                                    <div
                                        className="absolute top-0 left-0 h-1.5 w-full rounded-t-2xl"
                                        style={{
                                            backgroundColor:
                                                groupClass.color || '#8b5cf6',
                                        }}
                                    />

                                    <div className="mt-1 mb-4 flex items-start justify-between">
                                        <div
                                            className="flex size-12 items-center justify-center rounded-xl text-white shadow-inner"
                                            style={{
                                                backgroundColor:
                                                    groupClass.color ||
                                                    '#8b5cf6',
                                            }}
                                        >
                                            <Users className="size-6" />
                                        </div>
                                        <span
                                            className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                                                groupClass.status === 'active'
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            }`}
                                        >
                                            {groupClass.status === 'active'
                                                ? 'Ativa'
                                                : 'Inativa'}
                                        </span>
                                    </div>

                                    <h3 className="mb-2 text-xl font-bold tracking-tight transition-colors group-hover:text-primary">
                                        {groupClass.name}
                                    </h3>

                                    <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="size-4" />
                                        <span>
                                            {formatDays(groupClass.schedules)}
                                        </span>
                                    </div>

                                    <div className="mb-4 flex items-center gap-2 text-xs">
                                        <CalendarClock className="size-3.5 text-muted-foreground" />
                                        {groupClass.appointments_max_appointment_date ? (
                                            <span className="text-muted-foreground">
                                                Aulas geradas até{' '}
                                                <span className="font-semibold text-foreground">
                                                    {new Date(
                                                        groupClass.appointments_max_appointment_date +
                                                            'T12:00:00',
                                                    ).toLocaleDateString(
                                                        'pt-BR',
                                                    )}
                                                </span>
                                            </span>
                                        ) : (
                                            <span className="font-medium text-amber-600">
                                                Nenhuma aula gerada
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex -space-x-2">
                                                {groupClass.patients
                                                    ?.slice(0, 3)
                                                    .map(
                                                        (p: any, i: number) => (
                                                            <div
                                                                key={p.id}
                                                                className={`flex size-8 items-center justify-center rounded-full border-2 border-card text-[10px] font-bold shadow-sm ${
                                                                    [
                                                                        'bg-blue-100 text-blue-700',
                                                                        'bg-emerald-100 text-emerald-700',
                                                                        'bg-indigo-100 text-indigo-700',
                                                                    ][i % 3]
                                                                }`}
                                                            >
                                                                {p.name
                                                                    .charAt(0)
                                                                    .toUpperCase()}
                                                            </div>
                                                        ),
                                                    )}
                                                {groupClass.patients?.length ===
                                                    0 && (
                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                        Sem alunos
                                                    </span>
                                                )}
                                                {groupClass.patients?.length >
                                                    3 && (
                                                    <div className="flex size-8 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-bold text-muted-foreground">
                                                        +
                                                        {groupClass.patients
                                                            .length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="rounded-md bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                            {groupClass.patients?.length || 0} /{' '}
                                            {groupClass.max_participants} vagas
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}

                    {filteredClasses.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                            <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted/50">
                                <Users className="size-8 text-muted-foreground/50" />
                            </div>
                            <h3 className="mb-1 text-lg font-semibold text-foreground">
                                Nenhuma turma encontrada
                            </h3>
                            <p className="max-w-sm text-sm text-muted-foreground">
                                Comece criando sua primeira turma para organizar
                                seus alunos em grupos e gerenciar as sessões de
                                forma automática.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <GroupClassFormSheet
                isOpen={isSheetOpen}
                setIsOpen={setIsSheetOpen}
                patients={patients}
                users={users}
            />
        </AppLayout>
    );
}
