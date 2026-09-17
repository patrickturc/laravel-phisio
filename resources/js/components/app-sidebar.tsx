import { Link } from '@inertiajs/react';
import {
    Building2,
    LayoutGrid,
    Users,
    CalendarRange,
    Activity,
    BarChart3,
    ClipboardList,
    DollarSign,
    CreditCard,
    Settings,
    ShieldCheck,
    Tag,
    ChevronRight,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarGroup,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { usePermissions } from '@/hooks/use-permissions';
import { useTenantFeatures } from '@/hooks/use-tenant-features';

export function AppSidebar() {
    const { can } = usePermissions();
    const { isCurrentUrl } = useCurrentUrl();
    const { hasFeature } = useTenantFeatures();

    // Dynamically build main navigation based on permissions and tenant feature flags
    const mainNavItems = [
        {
            title: 'Dashboard',
            href: '/dashboard',
            icon: LayoutGrid,
            show: can('dashboard.view'),
        },
        {
            title: 'Agenda',
            href: '/appointments',
            icon: CalendarRange,
            show: can('appointments.manage.view'),
        },
        {
            title: 'Pacientes',
            href: '/patients',
            icon: Users,
            show: can('patients.manage.view'),
        },
        {
            title: 'Turmas',
            href: '/group-classes',
            icon: Users,
            show:
                can('group_classes.manage.view') && hasFeature('group_classes'),
        },
        {
            title: 'Evoluções',
            href: '/evolutions',
            icon: Activity,
            show: can('evolutions.manage.view'),
        },
        {
            title: 'Matrículas',
            href: '/memberships',
            icon: CreditCard,
            show: can('memberships.manage.view'),
        },
        {
            title: 'Relatórios',
            href: '/reports',
            icon: BarChart3,
            show: can('reports.manage.view') && hasFeature('reports'),
        },
        {
            title: 'Financeiro',
            href: '/financial',
            icon: DollarSign,
            show: can('financial.transactions.view') && hasFeature('financial'),
            items: [
                {
                    title: 'Fluxo de Caixa',
                    href: '/financial',
                    show: can('financial.transactions.view'),
                },
                {
                    title: 'Gastos Recorrentes',
                    href: '/recurring-expenses',
                    show: can('recurring_expenses.manage.view'),
                },
            ].filter((item) => item.show),
        },
    ].filter((item) => item.show);

    const settingsNavItems = [
        {
            title: 'Dados da Clínica',
            href: '/settings/organization',
            icon: Building2,
            show: can('settings.users.view'),
        },
        {
            title: 'Plano e Cobrança',
            href: '/settings/billing',
            icon: CreditCard,
            show: can('settings.users.view'),
        },
        {
            title: 'Protocolos Clínicos',
            href: '/clinical-protocols',
            icon: ClipboardList,
            show:
                can('treatment_plans.manage.view') &&
                hasFeature('clinical_protocols'),
        },
        {
            title: 'Planos e Pacotes',
            href: '/commercial-plans',
            icon: Tag,
            show: can('commercial_plans.manage.view'),
        },
        {
            title: 'Usuários',
            href: '/settings/users',
            icon: Users,
            show: can('settings.users.view'),
        },
        {
            title: 'Perfis de Acesso',
            href: '/settings/roles',
            icon: ShieldCheck,
            show: can('settings.roles.view'),
        },
    ].filter((item) => item.show);

    return (
        <Sidebar
            collapsible="icon"
            variant="inset"
            className="border-r border-border/50 bg-sidebar/90 shadow-sm backdrop-blur-xl"
        >
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="transition-colors hover:bg-primary/5"
                        >
                            <Link href={'/dashboard'} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />

                {settingsNavItems.length > 0 && (
                    <SidebarGroup className="mt-auto px-2 py-0">
                        <SidebarMenu>
                            <Collapsible
                                asChild
                                defaultOpen={settingsNavItems.some((item) =>
                                    isCurrentUrl(item.href),
                                )}
                            >
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton
                                            tooltip="Configurações"
                                            className="group"
                                        >
                                            <Settings />
                                            <span>Configurações</span>
                                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]:rotate-90" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            {settingsNavItems.map((item) => (
                                                <SidebarMenuSubItem
                                                    key={item.title}
                                                >
                                                    <SidebarMenuSubButton
                                                        asChild
                                                        isActive={isCurrentUrl(
                                                            item.href,
                                                        )}
                                                    >
                                                        <Link
                                                            href={item.href}
                                                            prefetch
                                                        >
                                                            <span>
                                                                {item.title}
                                                            </span>
                                                        </Link>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            ))}
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </SidebarMenuItem>
                            </Collapsible>
                        </SidebarMenu>
                    </SidebarGroup>
                )}
            </SidebarContent>

            <SidebarFooter className="pb-8 md:pb-2">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
