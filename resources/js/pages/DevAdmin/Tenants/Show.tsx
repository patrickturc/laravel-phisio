import DevAdminLayout from '@/layouts/DevAdminLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building, Users, CreditCard, Activity } from 'lucide-react';

interface ShowProps {
    tenant: any;
    usageLogs: any[];
}

export default function Show({ tenant, usageLogs }: ShowProps) {
    return (
        <DevAdminLayout>
            <Head title={`Detalhes - ${tenant.name}`} />

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Building className="h-6 w-6" /> {tenant.name}
                    </h2>
                    <p className="text-muted-foreground">{tenant.slug}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href={route('dev-admin.tenants.edit', tenant.id)}>Editar</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={route('dev-admin.tenants.index')}>Voltar</Link>
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Informações Gerais</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-sm font-medium text-muted-foreground">Status</span>
                                <div className="mt-1">
                                    <span className={`px-2 py-1 text-xs rounded-full ${tenant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {tenant.status}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-muted-foreground">Plano</span>
                                <p className="capitalize mt-1 font-medium">{tenant.plan}</p>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-muted-foreground">Documento</span>
                                <p className="mt-1">{tenant.document || '-'}</p>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-muted-foreground">Email de Contato</span>
                                <p className="mt-1">{tenant.email || '-'}</p>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-muted-foreground">Telefone</span>
                                <p className="mt-1">{tenant.phone || '-'}</p>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-muted-foreground">Usuários</span>
                                <p className="mt-1">{tenant.users?.length || 0} de {tenant.max_users}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Uso de Recursos (Recentes)</CardTitle>
                        <CardDescription>Instantâneos diários de uso desta organização.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {usageLogs.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Pacientes</TableHead>
                                        <TableHead>Agendamentos</TableHead>
                                        <TableHead>Storage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {usageLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>{new Date(log.reference_date).toLocaleDateString()}</TableCell>
                                            <TableCell>{log.patients_count}</TableCell>
                                            <TableCell>{log.appointments_count}</TableCell>
                                            <TableCell>{log.storage_mb} MB</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                                <Activity className="h-8 w-8 mb-2 opacity-50" />
                                <p>Nenhum log de uso encontrado.</p>
                                <p className="text-sm">Os logs são gerados diariamente.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DevAdminLayout>
    );
}
