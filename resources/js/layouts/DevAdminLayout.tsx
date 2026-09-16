import { usePage, Link } from '@inertiajs/react';
import { Home, Users, Megaphone } from 'lucide-react';
import { useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenu,
    SidebarProvider,
} from '@/components/ui/sidebar';
import type { AppLayoutProps } from '@/types';

export default function DevAdminLayout({ children }: AppLayoutProps) {
    const { flash } = usePage<{
        flash?: { success?: string; error?: string; warning?: string };
    }>().props as any;

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
        if (flash?.warning) toast.warning(flash.warning);
    }, [flash]);

    return (
        <SidebarProvider>
            <AppShell variant="sidebar">
                <Sidebar>
                    <SidebarHeader className="flex h-16 items-center border-b px-4 text-lg font-bold text-primary">
                        Phisio Dev Admin
                    </SidebarHeader>
                    <SidebarContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <Link href="/dev-admin">
                                        <Home className="h-4 w-4" />{' '}
                                        <span>Dashboard</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <Link href="/dev-admin/tenants">
                                        <Users className="h-4 w-4" />{' '}
                                        <span>Tenants</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <Link href="/dev-admin/announcements">
                                        <Megaphone className="h-4 w-4" />{' '}
                                        <span>Comunicados</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarContent>
                    <SidebarFooter>
                        <NavUser />
                    </SidebarFooter>
                </Sidebar>
                <AppContent variant="sidebar">
                    <header className="flex h-16 items-center border-b px-6">
                        <h1 className="text-lg font-semibold">
                            Administração do Sistema
                        </h1>
                    </header>
                    <main className="p-6">{children}</main>
                </AppContent>
                <Toaster
                    position="top-right"
                    richColors
                    closeButton
                    theme="system"
                />
            </AppShell>
        </SidebarProvider>
    );
}
