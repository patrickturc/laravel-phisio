import DevAdminLayout from '@/layouts/DevAdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search } from 'lucide-react';

interface IndexProps {
    tenants: {
        data: any[];
        links: any[];
        current_page: number;
        last_page: number;
    };
}

export default function Index({ tenants }: IndexProps) {
    const handleToggleStatus = (id: string) => {
        if (confirm('Tem certeza que deseja alterar o status desta organização?')) {
            router.post(route('dev-admin.tenants.toggle-status', id), {}, { preserveScroll: true });
        }
    };

    return (
        <DevAdminLayout>
            <Head title="Gerenciar Organizações" />

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold tracking-tight">Organizações</h2>
                <Button asChild>
                    <Link href={route('dev-admin.tenants.create')}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Nova Organização
                    </Link>
                </Button>
            </div>

            <div className="bg-background rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Usuários Max</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tenants.data.map((tenant) => (
                            <TableRow key={tenant.id}>
                                <TableCell>
                                    <div className="font-medium">{tenant.name}</div>
                                    <div className="text-sm text-muted-foreground">{tenant.slug}</div>
                                </TableCell>
                                <TableCell className="capitalize">{tenant.plan}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 text-xs rounded-full ${tenant.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                        {tenant.status}
                                    </span>
                                </TableCell>
                                <TableCell>{tenant.max_users}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={route('dev-admin.tenants.show', tenant.id)}>Ver</Link>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={route('dev-admin.tenants.edit', tenant.id)}>Editar</Link>
                                        </Button>
                                        <Button 
                                            variant={tenant.status === 'active' ? 'destructive' : 'default'} 
                                            size="sm"
                                            onClick={() => handleToggleStatus(tenant.id)}
                                        >
                                            {tenant.status === 'active' ? 'Suspender' : 'Ativar'}
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </DevAdminLayout>
    );
}
