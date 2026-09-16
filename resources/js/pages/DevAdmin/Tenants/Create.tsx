import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import DevAdminLayout from '@/layouts/DevAdminLayout';

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        document: '',
        email: '',
        phone: '',
        plan: 'free',
        max_users: 5,
        max_storage_mb: 1024,
        features: {
            financial: true,
            group_classes: true,
            clinical_protocols: true,
            reports: true,
            evolution_photos: true,
        },
    });

    const handleFeatureChange = (feature: string, checked: boolean) => {
        setData('features', {
            ...data.features,
            [feature]: checked,
        });
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/dev-admin/tenants');
    };

    return (
        <DevAdminLayout>
            <Head title="Nova Organização" />

            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Nova Organização</h2>
                <Button variant="outline" asChild>
                    <Link href="/dev-admin/tenants">Voltar</Link>
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
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                required
                            />
                            {errors.name && (
                                <p className="text-sm text-red-500">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="document">CNPJ / CPF</Label>
                                <Input
                                    id="document"
                                    value={data.document}
                                    onChange={(e) =>
                                        setData('document', e.target.value)
                                    }
                                />
                                {errors.document && (
                                    <p className="text-sm text-red-500">
                                        {errors.document}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Telefone</Label>
                                <Input
                                    id="phone"
                                    value={data.phone}
                                    onChange={(e) =>
                                        setData('phone', e.target.value)
                                    }
                                />
                                {errors.phone && (
                                    <p className="text-sm text-red-500">
                                        {errors.phone}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) =>
                                    setData('email', e.target.value)
                                }
                            />
                            {errors.email && (
                                <p className="text-sm text-red-500">
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="plan">Plano</Label>
                                <Select
                                    value={data.plan}
                                    onValueChange={(value) =>
                                        setData('plan', value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o plano" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="free">
                                            Gratuito
                                        </SelectItem>
                                        <SelectItem value="basic">
                                            Básico
                                        </SelectItem>
                                        <SelectItem value="pro">Pro</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.plan && (
                                    <p className="text-sm text-red-500">
                                        {errors.plan}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="max_users">Máx. Usuários</Label>
                                <Input
                                    id="max_users"
                                    type="number"
                                    value={data.max_users}
                                    onChange={(e) =>
                                        setData(
                                            'max_users',
                                            parseInt(e.target.value) || 1,
                                        )
                                    }
                                    min="1"
                                />
                                {errors.max_users && (
                                    <p className="text-sm text-red-500">
                                        {errors.max_users}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="max_storage_mb">
                                    Armazenamento (MB)
                                </Label>
                                <Input
                                    id="max_storage_mb"
                                    type="number"
                                    value={data.max_storage_mb}
                                    onChange={(e) =>
                                        setData(
                                            'max_storage_mb',
                                            parseInt(e.target.value) || 100,
                                        )
                                    }
                                    min="100"
                                    step="100"
                                />
                                {errors.max_storage_mb && (
                                    <p className="text-sm text-red-500">
                                        {errors.max_storage_mb}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-border pt-4">
                            <h3 className="mb-3 text-sm font-semibold">
                                Módulos Habilitados (Feature Flags)
                            </h3>
                            <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/40 p-4 sm:grid-cols-2">
                                <label className="flex cursor-pointer items-center space-x-3">
                                    <Checkbox
                                        checked={data.features.financial}
                                        onCheckedChange={(checked) =>
                                            handleFeatureChange(
                                                'financial',
                                                !!checked,
                                            )
                                        }
                                    />
                                    <div className="text-sm">
                                        <p className="font-medium text-foreground">
                                            Módulo Financeiro
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Fluxo de caixa e despesas
                                        </p>
                                    </div>
                                </label>

                                <label className="flex cursor-pointer items-center space-x-3">
                                    <Checkbox
                                        checked={data.features.group_classes}
                                        onCheckedChange={(checked) =>
                                            handleFeatureChange(
                                                'group_classes',
                                                !!checked,
                                            )
                                        }
                                    />
                                    <div className="text-sm">
                                        <p className="font-medium text-foreground">
                                            Aulas e Turmas
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Pilates e atendimentos em grupo
                                        </p>
                                    </div>
                                </label>

                                <label className="flex cursor-pointer items-center space-x-3">
                                    <Checkbox
                                        checked={
                                            data.features.clinical_protocols
                                        }
                                        onCheckedChange={(checked) =>
                                            handleFeatureChange(
                                                'clinical_protocols',
                                                !!checked,
                                            )
                                        }
                                    />
                                    <div className="text-sm">
                                        <p className="font-medium text-foreground">
                                            Protocolos Clínicos
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Modelos e fichas de avaliação
                                        </p>
                                    </div>
                                </label>

                                <label className="flex cursor-pointer items-center space-x-3">
                                    <Checkbox
                                        checked={data.features.reports}
                                        onCheckedChange={(checked) =>
                                            handleFeatureChange(
                                                'reports',
                                                !!checked,
                                            )
                                        }
                                    />
                                    <div className="text-sm">
                                        <p className="font-medium text-foreground">
                                            Relatórios Avançados
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Gráficos de desempenho e métricas
                                        </p>
                                    </div>
                                </label>

                                <label className="flex cursor-pointer items-center space-x-3">
                                    <Checkbox
                                        checked={data.features.evolution_photos}
                                        onCheckedChange={(checked) =>
                                            handleFeatureChange(
                                                'evolution_photos',
                                                !!checked,
                                            )
                                        }
                                    />
                                    <div className="text-sm">
                                        <p className="font-medium text-foreground">
                                            Fotos na Evolução
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Anexo de imagens nos prontuários
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={processing}>
                                Cadastrar Organização
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </DevAdminLayout>
    );
}
