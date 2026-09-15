import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { ImpersonationBanner } from '@/components/impersonation-banner';
import { SystemAnnouncementBanner } from '@/components/system-announcement-banner';
import { TrialBanner } from '@/components/trial-banner';
import type { AppLayoutProps } from '@/types';
import { Toaster, toast } from 'sonner';
import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string; warning?: string } }>().props as any;

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
        if (flash?.warning) toast.warning(flash.warning);
    }, [flash]);

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar">
                <ImpersonationBanner />
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <div className="px-4 sm:px-6 pt-2 space-y-2">
                    <TrialBanner />
                    <SystemAnnouncementBanner />
                </div>
                {children}
            </AppContent>
            <Toaster position="top-right" richColors closeButton theme="system" />
        </AppShell>
    );
}
