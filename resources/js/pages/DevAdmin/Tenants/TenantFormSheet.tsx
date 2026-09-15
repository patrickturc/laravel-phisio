import { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from '@/components/ui/sheet';
import {
    Building2,
    MapPin,
    Phone,
    Globe,
    ShieldCheck,
    Layers,
    UserPlus,
    Loader2,
    KeyRound,
    Sparkles,
} from 'lucide-react';

export interface TenantData {
    id?: string;
    name: string;
    legal_name?: string | null;
    document?: string | null;
    state_registration?: string | null;
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    website?: string | null;
    cep?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    technical_manager_name?: string | null;
    technical_manager_document?: string | null;
    notes?: string | null;
    plan: 'free' | 'basic' | 'pro';
    max_users: number;
    max_storage_mb: number;
    features?: {
        financial?: boolean;
        group_classes?: boolean;
        clinical_protocols?: boolean;
        reports?: boolean;
        evolution_photos?: boolean;
    };
}

interface TenantFormSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tenant?: TenantData | null;
}

export function TenantFormSheet({ open, onOpenChange, tenant }: TenantFormSheetProps) {
    const isEditing = !!tenant;
    const [isLoadingCep, setIsLoadingCep] = useState(false);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: tenant?.name || '',
        legal_name: tenant?.legal_name || '',
        document: tenant?.document || '',
        state_registration: tenant?.state_registration || '',
        email: tenant?.email || '',
        phone: tenant?.phone || '',
        whatsapp: tenant?.whatsapp || '',
        website: tenant?.website || '',
        cep: tenant?.cep || '',
        street: tenant?.street || '',
        number: tenant?.number || '',
        complement: tenant?.complement || '',
        neighborhood: tenant?.neighborhood || '',
        city: tenant?.city || '',
        state: tenant?.state || '',
        technical_manager_name: tenant?.technical_manager_name || '',
        technical_manager_document: tenant?.technical_manager_document || '',
        notes: tenant?.notes || '',
        plan: tenant?.plan || 'free',
        max_users: tenant?.max_users || 5,
        max_storage_mb: tenant?.max_storage_mb || 1024,
        features: {
            financial: tenant?.features?.financial ?? true,
            group_classes: tenant?.features?.group_classes ?? true,
            clinical_protocols: tenant?.features?.clinical_protocols ?? true,
            reports: tenant?.features?.reports ?? true,
            evolution_photos: tenant?.features?.evolution_photos ?? true,
        },
        // Admin inicial (somente no cadastro)
        admin_name: '',
        admin_email: '',
        admin_password: '',
    });

    useEffect(() => {
        if (open) {
            clearErrors();
            if (tenant) {
                setData({
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
                    admin_name: '',
                    admin_email: '',
                    admin_password: '',
                });
            } else {
                reset();
            }
        }
    }, [open, tenant]);

    const maskDocument = (value: string) => {
        const digits = value.replace(/\D/g, '');
        if (digits.length <= 11) {
            // CPF
            return digits
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})/, '$1-$2')
                .replace(/(-\d{2})\d+?$/, '$1');
        }
        // CNPJ
        return digits
            .replace(/(\d{2})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1/$2')
            .replace(/(\d{4})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    };

    const maskPhone = (value: string) => {
        const digits = value.replace(/\D/g, '');
        if (digits.length <= 10) {
            return digits
                .replace(/(\d{2})(\d)/, '($1) $2')
                .replace(/(\d{4})(\d)/, '$1-$2')
                .replace(/(-\d{4})\d+?$/, '$1');
        }
        return digits
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .replace(/(-\d{4})\d+?$/, '$1');
    };

    const maskCEP = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .replace(/(-\d{3})\d+?$/, '$1');
    };

    const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const masked = maskCEP(e.target.value);
        setData('cep', masked);

        if (masked.length === 9) {
            setIsLoadingCep(true);
            try {
                const response = await fetch(`https://viacep.com.br/ws/${masked.replace('-', '')}/json/`);
                const json = await response.json();
                if (!json.erro) {
                    setData((prev) => ({
                        ...prev,
                        street: json.logradouro || prev.street,
                        neighborhood: json.bairro || prev.neighborhood,
                        city: json.localidade || prev.city,
                        state: json.uf || prev.state,
                    }));
                }
            } catch (err) {
                console.error('Erro ao consultar CEP:', err);
            } finally {
                setIsLoadingCep(false);
            }
        }
    };

    const handleFeatureChange = (feature: string, checked: boolean) => {
        setData('features', {
            ...data.features,
            [feature]: checked,
        });
    };

    const generateRandomPassword = () => {
        const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
        let pass = '';
        for (let i = 0; i < 10; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setData('admin_password', pass);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
                reset();
            },
        };

        if (isEditing && tenant) {
            put(`/dev-admin/tenants/${tenant.id}`, options);
        } else {
            post('/dev-admin/tenants', options);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-2xl md:max-w-3xl overflow-y-auto p-0 flex flex-col">
                <SheetHeader className="p-6 pb-4 border-b border-border/60 bg-muted/20">
                    <SheetTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                        <Building2 className="h-5 w-5 text-primary" />
                        {isEditing ? `Editar ${tenant.name}` : 'Cadastrar Nova Organização'}
                    </SheetTitle>
                    <SheetDescription className="text-sm text-muted-foreground">
                        {isEditing
                            ? 'Atualize os dados cadastrais, endereço e parâmetros operacionais desta clínica.'
                            : 'Preencha as informações completas para aprovisionar uma nova clínica na plataforma.'}
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-6">
                    {/* SEÇÃO 1: Identificação & Dados Fiscais */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground pb-1 border-b border-border/40">
                            <Building2 className="w-4 h-4 text-primary" />
                            Identificação & Dados Fiscais
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="name">Nome Fantasia *</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Ex: FisioVida Pilates"
                                    required
                                />
                                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="legal_name">Razão Social</Label>
                                <Input
                                    id="legal_name"
                                    value={data.legal_name}
                                    onChange={(e) => setData('legal_name', e.target.value)}
                                    placeholder="Ex: FisioVida Serviços Médicos Ltda"
                                />
                                {errors.legal_name && <p className="text-xs text-destructive">{errors.legal_name}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="document">CNPJ / CPF</Label>
                                <Input
                                    id="document"
                                    value={data.document}
                                    onChange={(e) => setData('document', maskDocument(e.target.value))}
                                    placeholder="00.000.000/0001-00"
                                />
                                {errors.document && <p className="text-xs text-destructive">{errors.document}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="state_registration">Inscrição Estadual / Municipal</Label>
                                <Input
                                    id="state_registration"
                                    value={data.state_registration}
                                    onChange={(e) => setData('state_registration', e.target.value)}
                                    placeholder="Ex: 123.456.789.000"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO 2: Endereço Completo */}
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground pb-1 border-b border-border/40">
                            <MapPin className="w-4 h-4 text-primary" />
                            Endereço da Clínica
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="cep" className="flex items-center gap-1.5">
                                    CEP
                                    {isLoadingCep && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                                </Label>
                                <Input
                                    id="cep"
                                    value={data.cep}
                                    onChange={handleCepChange}
                                    placeholder="00000-000"
                                    maxLength={9}
                                />
                                {errors.cep && <p className="text-xs text-destructive">{errors.cep}</p>}
                            </div>

                            <div className="sm:col-span-2 space-y-1.5">
                                <Label htmlFor="street">Logradouro / Rua</Label>
                                <Input
                                    id="street"
                                    value={data.street}
                                    onChange={(e) => setData('street', e.target.value)}
                                    placeholder="Ex: Av. Paulista"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="number">Número</Label>
                                <Input
                                    id="number"
                                    value={data.number}
                                    onChange={(e) => setData('number', e.target.value)}
                                    placeholder="Ex: 1500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="complement">Complemento</Label>
                                <Input
                                    id="complement"
                                    value={data.complement}
                                    onChange={(e) => setData('complement', e.target.value)}
                                    placeholder="Ex: Sala 42"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="neighborhood">Bairro</Label>
                                <Input
                                    id="neighborhood"
                                    value={data.neighborhood}
                                    onChange={(e) => setData('neighborhood', e.target.value)}
                                    placeholder="Ex: Bela Vista"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-2 space-y-1.5">
                                <Label htmlFor="city">Cidade</Label>
                                <Input
                                    id="city"
                                    value={data.city}
                                    onChange={(e) => setData('city', e.target.value)}
                                    placeholder="Ex: São Paulo"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="state">UF (Estado)</Label>
                                <Input
                                    id="state"
                                    value={data.state}
                                    onChange={(e) => setData('state', e.target.value.toUpperCase())}
                                    placeholder="SP"
                                    maxLength={2}
                                />
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO 3: Contatos & Comunicação */}
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground pb-1 border-b border-border/40">
                            <Phone className="w-4 h-4 text-primary" />
                            Canais de Atendimento & Redes
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="email">Email Principal da Clínica</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="contato@fisiovida.com.br"
                                />
                                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="phone">Telefone Fixo / Comercial</Label>
                                <Input
                                    id="phone"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', maskPhone(e.target.value))}
                                    placeholder="(11) 3456-7890"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="whatsapp">WhatsApp Comercial</Label>
                                <Input
                                    id="whatsapp"
                                    value={data.whatsapp}
                                    onChange={(e) => setData('whatsapp', maskPhone(e.target.value))}
                                    placeholder="(11) 99999-8888"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="website">Site ou Instagram</Label>
                                <Input
                                    id="website"
                                    value={data.website}
                                    onChange={(e) => setData('website', e.target.value)}
                                    placeholder="https://fisiovida.com.br ou @fisiovida"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO 4: Responsável Técnico (RT) */}
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground pb-1 border-b border-border/40">
                            <ShieldCheck className="w-4 h-4 text-primary" />
                            Responsabilidade Técnica & Conformidade
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="technical_manager_name">Nome do Responsável Técnico</Label>
                                <Input
                                    id="technical_manager_name"
                                    value={data.technical_manager_name}
                                    onChange={(e) => setData('technical_manager_name', e.target.value)}
                                    placeholder="Dr(a). Nome do Fisioterapeuta"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="technical_manager_document">Registro Profissional (CREFITO / CRM)</Label>
                                <Input
                                    id="technical_manager_document"
                                    value={data.technical_manager_document}
                                    onChange={(e) => setData('technical_manager_document', e.target.value)}
                                    placeholder="Ex: CREFITO-3/123456-F"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO 5: Plano, Armazenamento & Módulos */}
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground pb-1 border-b border-border/40">
                            <Layers className="w-4 h-4 text-primary" />
                            Plano, Limites & Módulos Contratados
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="plan">Plano Contratado</Label>
                                <Select value={data.plan} onValueChange={(val: any) => setData('plan', val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o plano" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="free">Gratuito</SelectItem>
                                        <SelectItem value="basic">Básico</SelectItem>
                                        <SelectItem value="pro">Profissional (Pro)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="max_users">Máx. Usuários</Label>
                                <Input
                                    id="max_users"
                                    type="number"
                                    value={data.max_users}
                                    onChange={(e) => setData('max_users', parseInt(e.target.value) || 1)}
                                    min="1"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="max_storage_mb">Armazenamento (MB)</Label>
                                <Input
                                    id="max_storage_mb"
                                    type="number"
                                    value={data.max_storage_mb}
                                    onChange={(e) => setData('max_storage_mb', parseInt(e.target.value) || 100)}
                                    min="100"
                                    step="100"
                                />
                            </div>
                        </div>

                        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                            <span className="text-xs font-semibold text-foreground block">
                                Módulos Habilitados para esta Organização
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="flex items-center space-x-2.5 cursor-pointer">
                                    <Checkbox
                                        checked={data.features.financial}
                                        onCheckedChange={(c) => handleFeatureChange('financial', !!c)}
                                    />
                                    <span className="text-xs font-medium">Financeiro (Fluxo de Caixa / Despesas)</span>
                                </label>
                                <label className="flex items-center space-x-2.5 cursor-pointer">
                                    <Checkbox
                                        checked={data.features.group_classes}
                                        onCheckedChange={(c) => handleFeatureChange('group_classes', !!c)}
                                    />
                                    <span className="text-xs font-medium">Turmas & Aulas Coletivas</span>
                                </label>
                                <label className="flex items-center space-x-2.5 cursor-pointer">
                                    <Checkbox
                                        checked={data.features.clinical_protocols}
                                        onCheckedChange={(c) => handleFeatureChange('clinical_protocols', !!c)}
                                    />
                                    <span className="text-xs font-medium">Protocolos Clínicos</span>
                                </label>
                                <label className="flex items-center space-x-2.5 cursor-pointer">
                                    <Checkbox
                                        checked={data.features.reports}
                                        onCheckedChange={(c) => handleFeatureChange('reports', !!c)}
                                    />
                                    <span className="text-xs font-medium">Relatórios Gerenciais Avançados</span>
                                </label>
                                <label className="flex items-center space-x-2.5 cursor-pointer">
                                    <Checkbox
                                        checked={data.features.evolution_photos}
                                        onCheckedChange={(c) => handleFeatureChange('evolution_photos', !!c)}
                                    />
                                    <span className="text-xs font-medium">Anexar Fotos em Prontuários</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO 6: Administrador Inicial (Apenas na Criação) */}
                    {!isEditing && (
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground pb-1 border-b border-border/40">
                                <UserPlus className="w-4 h-4 text-primary" />
                                Primeiro Administrador da Clínica (Opcional)
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Crie o primeiro usuário com perfil de Administrador já vinculado a esta clínica para início imediato.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="admin_name">Nome do Administrador</Label>
                                    <Input
                                        id="admin_name"
                                        value={data.admin_name}
                                        onChange={(e) => setData('admin_name', e.target.value)}
                                        placeholder="Ex: Dr. Roberto Silva"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="admin_email">E-mail de Acesso</Label>
                                    <Input
                                        id="admin_email"
                                        type="email"
                                        value={data.admin_email}
                                        onChange={(e) => setData('admin_email', e.target.value)}
                                        placeholder="roberto@fisiovida.com.br"
                                    />
                                    {errors.admin_email && <p className="text-xs text-destructive">{errors.admin_email}</p>}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="admin_password">Senha Provisória</Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={generateRandomPassword}
                                        className="h-6 px-2 text-xs text-primary gap-1"
                                    >
                                        <Sparkles className="w-3 h-3" /> Gerar Senha
                                    </Button>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="admin_password"
                                        value={data.admin_password}
                                        onChange={(e) => setData('admin_password', e.target.value)}
                                        placeholder="Mínimo de 8 caracteres"
                                    />
                                </div>
                                {errors.admin_password && <p className="text-xs text-destructive">{errors.admin_password}</p>}
                            </div>
                        </div>
                    )}

                    {/* Observações Internas */}
                    <div className="space-y-1.5 pt-2">
                        <Label htmlFor="notes">Notas & Observações Internas (Dev Admin)</Label>
                        <textarea
                            id="notes"
                            rows={2}
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            placeholder="Anotações para o suporte e controle interno..."
                            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>

                    <SheetFooter className="pt-4 border-t border-border flex flex-row items-center justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Salvando...
                                </>
                            ) : isEditing ? (
                                'Salvar Alterações'
                            ) : (
                                'Cadastrar Organização'
                            )}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}
