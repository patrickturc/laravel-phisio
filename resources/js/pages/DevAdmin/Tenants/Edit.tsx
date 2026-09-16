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

interface EditProps {
    tenant: any;
}

export default function Edit({ tenant }: EditProps) {
    const { data, setData, put, processing, errors } = useForm({
        name: tenant.name || '',
        legal_name: tenant.legal_name || '',
        document: tenant.document || '',
        state_registration: tenant.state_registration || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        whatsapp: tenant.whatsapp || '',
        website: tenant.website || '',
        cep: tenant.cep || '',
        street: tenant.street || '',
        number: tenant.number || '',
        complement: tenant.complement || '',
        neighborhood: tenant.neighborhood || '',
        city: tenant.city || '',
        state: tenant.state || '',
        technical_manager_name: tenant.technical_manager_name || '',
        technical_manager_document: tenant.technical_manager_document || '',
        notes: tenant.notes || '',
        plan: tenant.plan || 'free',
        max_users: tenant.max_users || 5,
        max_storage_mb: tenant.max_storage_mb || 1024,
        features: {
            financial: tenant.features?.financial ?? true,
            group_classes: tenant.features?.group_classes ?? true,
            clinical_protocols: tenant.features?.clinical_protocols ?? true,
            reports: tenant.features?.reports ?? true,
            evolution_photos: tenant.features?.evolution_photos ?? true,
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
        put(`/dev-admin/tenants/${tenant.id}`);
    };

    return (
        <DevAdminLayout>
            <Head title={`Editar - ${tenant.name}`} />

            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Editar Organização</h2>
                <Button variant="outline" asChild>
                    <Link href="/dev-admin/tenants">Voltar</Link>
                </Button>
            </div>

            <Card className="max-w-3xl">
                <CardHeader>
                    <CardTitle>Detalhes da Organização</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="space-y-6">
                        {/* Identificação */}
                        <div className="space-y-4">
                            <h3 className="border-b pb-1 text-sm font-semibold text-foreground">
                                Identificação & Fiscal
                            </h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">
                                        Nome Fantasia *
                                    </Label>
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
                                <div className="space-y-2">
                                    <Label htmlFor="legal_name">
                                        Razão Social
                                    </Label>
                                    <Input
                                        id="legal_name"
                                        value={data.legal_name}
                                        onChange={(e) =>
                                            setData(
                                                'legal_name',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                                    <Label htmlFor="state_registration">
                                        Inscrição Estadual / Municipal
                                    </Label>
                                    <Input
                                        id="state_registration"
                                        value={data.state_registration}
                                        onChange={(e) =>
                                            setData(
                                                'state_registration',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Endereço */}
                        <div className="space-y-4 pt-2">
                            <h3 className="border-b pb-1 text-sm font-semibold text-foreground">
                                Endereço
                            </h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="cep">CEP</Label>
                                    <Input
                                        id="cep"
                                        value={data.cep}
                                        onChange={(e) =>
                                            setData('cep', e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="street">
                                        Rua / Logradouro
                                    </Label>
                                    <Input
                                        id="street"
                                        value={data.street}
                                        onChange={(e) =>
                                            setData('street', e.target.value)
                                        }
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="number">Número</Label>
                                    <Input
                                        id="number"
                                        value={data.number}
                                        onChange={(e) =>
                                            setData('number', e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="complement">
                                        Complemento
                                    </Label>
                                    <Input
                                        id="complement"
                                        value={data.complement}
                                        onChange={(e) =>
                                            setData(
                                                'complement',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="neighborhood">Bairro</Label>
                                    <Input
                                        id="neighborhood"
                                        value={data.neighborhood}
                                        onChange={(e) =>
                                            setData(
                                                'neighborhood',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="city">Cidade</Label>
                                    <Input
                                        id="city"
                                        value={data.city}
                                        onChange={(e) =>
                                            setData('city', e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="state">UF (Estado)</Label>
                                    <Input
                                        id="state"
                                        value={data.state}
                                        onChange={(e) =>
                                            setData('state', e.target.value)
                                        }
                                        maxLength={2}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Contatos */}
                        <div className="space-y-4 pt-2">
                            <h3 className="border-b pb-1 text-sm font-semibold text-foreground">
                                Contatos & Redes
                            </h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Telefone</Label>
                                    <Input
                                        id="phone"
                                        value={data.phone}
                                        onChange={(e) =>
                                            setData('phone', e.target.value)
                                        }
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="whatsapp">WhatsApp</Label>
                                    <Input
                                        id="whatsapp"
                                        value={data.whatsapp}
                                        onChange={(e) =>
                                            setData('whatsapp', e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="website">
                                        Website / Instagram
                                    </Label>
                                    <Input
                                        id="website"
                                        value={data.website}
                                        onChange={(e) =>
                                            setData('website', e.target.value)
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Responsável Técnico */}
                        <div className="space-y-4 pt-2">
                            <h3 className="border-b pb-1 text-sm font-semibold text-foreground">
                                Responsabilidade Técnica
                            </h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="technical_manager_name">
                                        Nome do RT
                                    </Label>
                                    <Input
                                        id="technical_manager_name"
                                        value={data.technical_manager_name}
                                        onChange={(e) =>
                                            setData(
                                                'technical_manager_name',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="technical_manager_document">
                                        Registro Profissional (CREFITO)
                                    </Label>
                                    <Input
                                        id="technical_manager_document"
                                        value={data.technical_manager_document}
                                        onChange={(e) =>
                                            setData(
                                                'technical_manager_document',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>
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
                                Salvar Alterações
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </DevAdminLayout>
    );
}
