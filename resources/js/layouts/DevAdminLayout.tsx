import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarItem, SidebarMenu, SidebarProvider } from '@/components/ui/sidebar';
import type { AppLayoutProps } from '@/types';
import { Toaster, toast } from 'sonner';
import { usePage, Link } from '@inertiajs/react';
import { useEffect } from 'react';
import { Home, Users, Settings, LogOut } from 'lucide-react';
import { NavUser } from '@/components/nav-user';

export default function DevAdminLayout({ children, breadcrumbs = [] }: AppLayoutProps) {
    const { auth, flash } = usePage<{ auth: any, flash?: { success?: string; error?: string; warning?: string } }>().props as any;

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
        if (flash?.warning) toast.warning(flash.warning);
    }, [flash]);

    return (
        <SidebarProvider>
            <AppShell variant="sidebar">
                <Sidebar>
                    <SidebarHeader className="h-16 border-b flex items-center px-4 font-bold text-lg text-primary">
                        Phisio Dev Admin
                    </SidebarHeader>
                    <SidebarContent>
                        <SidebarMenu>
                            <SidebarItem>
                                <Link href={route('dev-admin.dashboard')} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                                    <Home className="w-4 h-4" /> Dashboard
                                </Link>
                            </SidebarItem>
                            <SidebarItem>
                                <Link href={route('dev-admin.tenants.index')} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                                    <Users className="w-4 h-4" /> Tenants
                                </Link>
                            </SidebarItem>
                        </SidebarMenu>
                    </SidebarContent>
                    <SidebarFooter>
                        <NavUser />
                    </SidebarFooter>
                </Sidebar>
                <AppContent variant="sidebar">
                    <header className="h-16 border-b flex items-center px-6">
                        <h1 className="font-semibold text-lg">Administração do Sistema</h1>
                    </header>
                    <main className="p-6">
                        {children}
                    </main>
                </AppContent>
                <Toaster position="top-right" richColors closeButton theme="system" />
            </AppShell>
        </SidebarProvider>
    );
}
