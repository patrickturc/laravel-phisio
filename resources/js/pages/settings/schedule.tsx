import { Head } from '@inertiajs/react';
import { AgendaSettingsForm } from '@/components/agenda-settings-form';
import { OrganizationHeader } from '@/components/organization-header';
import AppLayout from '@/layouts/app-layout';
import type { Professional, ScheduleSettings } from '@/lib/agenda';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Configurações', href: '/settings/organization' },
    { title: 'Perfil da Clínica', href: '/settings/organization' },
    { title: 'Agenda', href: '/settings/schedule' },
];

/**
 * "Agenda" tab of the clinic profile: business hours, breaks, slot capacity,
 * rooms and the team's colours and availability.
 */
export default function ScheduleSettingsPage({
    settings,
    professionals,
}: {
    settings: ScheduleSettings;
    professionals: Professional[];
}) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Agenda - Perfil da Clínica" />

            <div className="mx-auto flex h-full w-full max-w-4xl flex-1 flex-col gap-6 p-6 md:p-10">
                <OrganizationHeader />

                <div className="rounded-2xl border border-border bg-card p-6">
                    <AgendaSettingsForm
                        settings={settings}
                        professionals={professionals}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
