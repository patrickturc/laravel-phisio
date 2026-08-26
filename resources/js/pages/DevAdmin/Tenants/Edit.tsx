import DevAdminLayout from '@/layouts/DevAdminLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EditProps {
    tenant: any;
}

export default function Edit({ tenant }: EditProps) {
    const { data, setData, put, processing, errors } = useForm({
        name: tenant.name || '',
        document: tenant.document || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        plan: tenant.plan || 'free',
        max_users: tenant.max_users || 5,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('dev-admin.tenants.update', tenant.id));
    };

    return (
        <DevAdminLayout>
            <Head title={`Editar - ${tenant.name}`} />

            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Editar Organização</h2>
                <Button variant="outline" asChild>
                    <Link href={route('dev-admin.tenants.index')}>Voltar</Link>
                </Button>
            </div>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Detalhes da Organização</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome da Empresa</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                            />
                            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="document">CNPJ / CPF</Label>
                                <Input
                                    id="document"
                                    value={data.document}
                                    onChange={(e) => setData('document', e.target.value)}
                                />
                                {errors.document && <p className="text-sm text-red-500">{errors.document}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Telefone</Label>
                                <Input
                                    id="phone"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                />
                                {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                            />
                            {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="plan">Plano</Label>
                                <Select value={data.plan} onValueChange={(value) => setData('plan', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o plano" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="free">Gratuito</SelectItem>
                                        <SelectItem value="basic">Básico</SelectItem>
                                        <SelectItem value="pro">Pro</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.plan && <p className="text-sm text-red-500">{errors.plan}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="max_users">Máx. Usuários</Label>
                                <Input
                                    id="max_users"
                                    type="number"
                                    value={data.max_users}
                                    onChange={(e) => setData('max_users', parseInt(e.target.value))}
                                    min="1"
                                />
                                {errors.max_users && <p className="text-sm text-red-500">{errors.max_users}</p>}
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button type="submit" disabled={processing}>
                                Salvar Alterações
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </DevAdminLayout>
    );
}
