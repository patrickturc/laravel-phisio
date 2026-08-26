import DevAdminLayout from '@/layouts/DevAdminLayout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building, Activity } from 'lucide-react';

interface DashboardProps {
    stats: {
        total_tenants: number;
        active_tenants: number;
        total_users: number;
    };
    recentTenants: any[];
}

export default function Dashboard({ stats, recentTenants }: DashboardProps) {
    return (
        <DevAdminLayout>
            <Head title="Dev Admin Dashboard" />

            <div className="grid gap-4 md:grid-cols-3 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Organizações</CardTitle>
                        <Building className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total_tenants}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Organizações Ativas</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.active_tenants}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total_users}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Organizações Recentes</CardTitle>
                    <CardDescription>As últimas 5 organizações cadastradas no sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {recentTenants.map((tenant) => (
                            <div key={tenant.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                <div>
                                    <p className="font-medium">{tenant.name}</p>
                                    <p className="text-sm text-muted-foreground">{tenant.slug}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 text-xs rounded-full ${tenant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {tenant.status}
                                    </span>
                                    <Link href={route('dev-admin.tenants.show', tenant.id)} className="text-sm text-primary hover:underline">
                                        Detalhes
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </DevAdminLayout>
    );
}
