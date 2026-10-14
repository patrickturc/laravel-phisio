import { Head, useForm } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    Building2,
    Camera,
    CheckCircle2,
    ImageIcon,
    Instagram,
    Loader2,
    MapPin,
    QrCode,
    ShieldCheck,
    Smartphone,
    UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { ImageUpload } from '@/components/image-upload';
import InputError from '@/components/input-error';
import { OrganizationHeader } from '@/components/organization-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { maskCEP, maskCPF, maskDocument, maskPhone } from '@/lib/masks';
import type { BreadcrumbItem } from '@/types';

type TenantForm = {
    name: string;
    legal_name: string;
    document: string;
    state_registration: string;
    owner_name: string;
    owner_document: string;
    owner_birthdate: string;
    email: string;
    phone: string;
    whatsapp: string;
    website: string;
    instagram: string;
    pix_key_type: string;
    pix_key: string;
    bio: string;
    cep: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    technical_manager_name: string;
    technical_manager_document: string;
};

type Props = {
    tenant: Partial<Record<keyof TenantForm, string | null>>;
    images: { logo: string | null; 'owner-photo': string | null };
    missingFields: string[];
    requiredFields: string[];
};

const BIO_LIMIT = 2000;

const PIX_PLACEHOLDERS: Record<string, string> = {
    cpf_cnpj: '00.000.000/0000-00',
    phone: '(00) 00000-0000',
    email: 'financeiro@suaclinica.com.br',
    random: '123e4567-e89b-12d3-a456-426614174000',
};

/** The stored key (digits, +55…) back in the format people type it. */
function displayPixKey(
    type: string | null | undefined,
    key: string | null | undefined,
): string {
    if (!key) return '';
    if (type === 'cpf_cnpj') return maskDocument(key);
    if (type === 'phone') return maskPhone(key.replace(/^\+55/, ''));

    return key;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Configurações', href: '/settings/organization' },
    { title: 'Perfil da Clínica', href: '/settings/organization' },
];

function SectionTitle({
    icon: Icon,
    title,
}: {
    icon: LucideIcon;
    title: string;
}) {
    return (
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Icon className="size-5 text-primary" />
            {title}
        </h2>
    );
}

function SubsectionTitle({
    icon: Icon,
    title,
}: {
    icon: LucideIcon;
    title: string;
}) {
    return (
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Icon className="size-4 text-primary" />
            {title}
        </h3>
    );
}

export default function Organization({ tenant, images, missingFields }: Props) {
    const [loadingCep, setLoadingCep] = useState(false);

    const { data, setData, patch, processing, errors, recentlySuccessful } =
        useForm<TenantForm>({
            name: tenant.name ?? '',
            legal_name: tenant.legal_name ?? '',
            document: maskDocument(tenant.document ?? ''),
            state_registration: tenant.state_registration ?? '',
            owner_name: tenant.owner_name ?? '',
            owner_document: maskCPF(tenant.owner_document ?? ''),
            owner_birthdate: tenant.owner_birthdate ?? '',
            email: tenant.email ?? '',
            phone: maskPhone(tenant.phone ?? ''),
            whatsapp: maskPhone(tenant.whatsapp ?? ''),
            website: tenant.website ?? '',
            instagram: tenant.instagram ?? '',
            pix_key_type: tenant.pix_key_type ?? '',
            pix_key: displayPixKey(tenant.pix_key_type, tenant.pix_key),
            bio: tenant.bio ?? '',
            cep: maskCEP(tenant.cep ?? ''),
            street: tenant.street ?? '',
            number: tenant.number ?? '',
            complement: tenant.complement ?? '',
            neighborhood: tenant.neighborhood ?? '',
            city: tenant.city ?? '',
            state: tenant.state ?? '',
            technical_manager_name: tenant.technical_manager_name ?? '',
            technical_manager_document: tenant.technical_manager_document ?? '',
        });

    // Fill the address from the postcode, the same lookup the dev admin form uses.
    const lookupCep = async (value: string) => {
        const digits = value.replace(/\D/g, '');

        if (digits.length !== 8) {
            return;
        }

        setLoadingCep(true);

        try {
            const response = await fetch(
                `https://viacep.com.br/ws/${digits}/json/`,
            );
            const result = await response.json();

            if (!result.erro) {
                setData((current) => ({
                    ...current,
                    street: result.logradouro || current.street,
                    neighborhood: result.bairro || current.neighborhood,
                    city: result.localidade || current.city,
                    state: result.uf || current.state,
                }));
            }
        } catch {
            // Offline or ViaCEP down: the fields stay editable by hand.
        } finally {
            setLoadingCep(false);
        }
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        patch('/settings/organization', { preserveScroll: true });
    };

    const isMissing = (field: string) => missingFields.includes(field);

    const fieldClass = (field: string) =>
        isMissing(field)
            ? 'border-amber-400 focus-visible:border-amber-500'
            : undefined;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Perfil da Clínica" />

            <div className="mx-auto flex h-full w-full max-w-6xl flex-1 flex-col gap-6 p-6 md:p-10">
                <OrganizationHeader />

                {missingFields.length > 0 && (
                    <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
                        Os campos destacados ainda precisam ser preenchidos para
                        concluir o cadastro.
                    </p>
                )}

                <form onSubmit={submit} className="space-y-6">
                    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                        {/* ── Informações básicas ── */}
                        <div className="space-y-6 rounded-2xl border border-border bg-card p-6">
                            <SectionTitle
                                icon={Building2}
                                title="Informações básicas"
                            />

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">
                                        Nome da clínica
                                    </Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) =>
                                            setData('name', e.target.value)
                                        }
                                        required
                                    />
                                    <InputError message={errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="legal_name">
                                        Razão social
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
                                    <InputError message={errors.legal_name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="document">
                                        CNPJ ou CPF
                                    </Label>
                                    <Input
                                        id="document"
                                        value={data.document}
                                        onChange={(e) =>
                                            setData(
                                                'document',
                                                maskDocument(e.target.value),
                                            )
                                        }
                                        placeholder="00.000.000/0000-00"
                                        className={fieldClass('document')}
                                        required
                                    />
                                    <InputError message={errors.document} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="state_registration">
                                        Inscrição estadual
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
                                    <InputError
                                        message={errors.state_registration}
                                    />
                                </div>
                            </div>

                            <Separator />

                            <SubsectionTitle
                                icon={UserRound}
                                title="Proprietário"
                            />
                            <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                                <div className="grid gap-2">
                                    <Label htmlFor="owner_name">Nome</Label>
                                    <Input
                                        id="owner_name"
                                        value={data.owner_name}
                                        onChange={(e) =>
                                            setData(
                                                'owner_name',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <InputError message={errors.owner_name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="owner_document">CPF</Label>
                                    <Input
                                        id="owner_document"
                                        value={data.owner_document}
                                        onChange={(e) =>
                                            setData(
                                                'owner_document',
                                                maskCPF(e.target.value),
                                            )
                                        }
                                        placeholder="000.000.000-00"
                                    />
                                    <InputError
                                        message={errors.owner_document}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="owner_birthdate">
                                        Data de nascimento
                                    </Label>
                                    <Input
                                        id="owner_birthdate"
                                        type="date"
                                        value={data.owner_birthdate}
                                        onChange={(e) =>
                                            setData(
                                                'owner_birthdate',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={errors.owner_birthdate}
                                    />
                                </div>
                            </div>

                            <Separator />

                            <SubsectionTitle
                                icon={ShieldCheck}
                                title="Responsabilidade técnica"
                            />
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="technical_manager_name">
                                        Responsável técnico
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
                                        className={fieldClass(
                                            'technical_manager_name',
                                        )}
                                        required
                                    />
                                    <InputError
                                        message={errors.technical_manager_name}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="technical_manager_document">
                                        Registro profissional (CREFITO/CREF)
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
                                        className={fieldClass(
                                            'technical_manager_document',
                                        )}
                                        required
                                    />
                                    <InputError
                                        message={
                                            errors.technical_manager_document
                                        }
                                    />
                                </div>
                            </div>

                            <Separator />

                            <SubsectionTitle icon={ImageIcon} title="Imagens" />
                            <div className="grid gap-6 sm:grid-cols-2">
                                <ImageUpload
                                    image="logo"
                                    label="Logo da clínica"
                                    hint="JPG ou PNG, até 2 MB. Fundo claro funciona melhor."
                                    url={images.logo}
                                    icon={ImageIcon}
                                />
                                <ImageUpload
                                    image="owner-photo"
                                    label="Foto do proprietário"
                                    hint="Para perfil e assinatura. JPG ou PNG, até 2 MB, rosto bem visível."
                                    url={images['owner-photo']}
                                    icon={Camera}
                                    rounded
                                />
                            </div>

                            <Separator />

                            <div className="grid gap-2">
                                <Label htmlFor="bio">Biografia / Sobre</Label>
                                <textarea
                                    id="bio"
                                    value={data.bio}
                                    onChange={(e) =>
                                        setData('bio', e.target.value)
                                    }
                                    maxLength={BIO_LIMIT}
                                    placeholder="Conte sobre a história da clínica, metodologia, diferenciais..."
                                    className="flex min-h-[120px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                                />
                                <div className="flex justify-between">
                                    <InputError message={errors.bio} />
                                    <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                                        {data.bio.length}/{BIO_LIMIT}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ── Dados de contato ── */}
                        <div className="space-y-6 rounded-2xl border border-border bg-card p-6">
                            <SectionTitle
                                icon={MapPin}
                                title="Dados de contato"
                            />

                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">E-mail</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) =>
                                            setData('email', e.target.value)
                                        }
                                        required
                                    />
                                    <InputError message={errors.email} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Telefone</Label>
                                    <Input
                                        id="phone"
                                        value={data.phone}
                                        onChange={(e) =>
                                            setData(
                                                'phone',
                                                maskPhone(e.target.value),
                                            )
                                        }
                                        placeholder="(00) 0000-0000"
                                        required
                                    />
                                    <InputError message={errors.phone} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="whatsapp">WhatsApp</Label>
                                    <div className="relative">
                                        <Smartphone className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            id="whatsapp"
                                            value={data.whatsapp}
                                            onChange={(e) =>
                                                setData(
                                                    'whatsapp',
                                                    maskPhone(e.target.value),
                                                )
                                            }
                                            placeholder="(00) 00000-0000"
                                            className="pl-9"
                                        />
                                    </div>
                                    <InputError message={errors.whatsapp} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="instagram">Instagram</Label>
                                    <div className="relative">
                                        <Instagram className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            id="instagram"
                                            value={data.instagram}
                                            onChange={(e) =>
                                                setData(
                                                    'instagram',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="@suaclinica"
                                            className="pl-9"
                                        />
                                    </div>
                                    <InputError message={errors.instagram} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="website">Site</Label>
                                    <Input
                                        id="website"
                                        value={data.website}
                                        onChange={(e) =>
                                            setData('website', e.target.value)
                                        }
                                        placeholder="www.suaclinica.com.br"
                                    />
                                    <InputError message={errors.website} />
                                </div>
                            </div>

                            <Separator />

                            <div className="grid gap-4">
                                <SubsectionTitle
                                    icon={QrCode}
                                    title="Recebimento por PIX"
                                />
                                <p className="-mt-2 text-xs text-muted-foreground">
                                    Usada para gerar o PIX copia e cola e o QR
                                    Code das cobranças.
                                </p>
                                <div className="grid gap-2">
                                    <Label htmlFor="pix_key_type">
                                        Tipo da chave
                                    </Label>
                                    <select
                                        id="pix_key_type"
                                        value={data.pix_key_type}
                                        onChange={(e) =>
                                            setData((current) => ({
                                                ...current,
                                                pix_key_type: e.target.value,
                                                pix_key: '',
                                            }))
                                        }
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                                    >
                                        <option value="">Sem chave PIX</option>
                                        <option value="cpf_cnpj">
                                            CPF ou CNPJ
                                        </option>
                                        <option value="phone">Celular</option>
                                        <option value="email">E-mail</option>
                                        <option value="random">
                                            Chave aleatória
                                        </option>
                                    </select>
                                    <InputError message={errors.pix_key_type} />
                                </div>
                                {data.pix_key_type && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="pix_key">
                                            Chave PIX
                                        </Label>
                                        <Input
                                            id="pix_key"
                                            value={data.pix_key}
                                            onChange={(e) =>
                                                setData(
                                                    'pix_key',
                                                    data.pix_key_type ===
                                                        'cpf_cnpj'
                                                        ? maskDocument(
                                                              e.target.value,
                                                          )
                                                        : data.pix_key_type ===
                                                            'phone'
                                                          ? maskPhone(
                                                                e.target.value,
                                                            )
                                                          : e.target.value,
                                                )
                                            }
                                            placeholder={
                                                PIX_PLACEHOLDERS[
                                                    data.pix_key_type
                                                ]
                                            }
                                        />
                                        <InputError message={errors.pix_key} />
                                    </div>
                                )}
                            </div>

                            <Separator />

                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="cep"
                                        className="flex items-center gap-2"
                                    >
                                        CEP
                                        {loadingCep && (
                                            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                                        )}
                                    </Label>
                                    <Input
                                        id="cep"
                                        value={data.cep}
                                        onChange={(e) =>
                                            setData(
                                                'cep',
                                                maskCEP(e.target.value),
                                            )
                                        }
                                        onBlur={(e) =>
                                            lookupCep(e.target.value)
                                        }
                                        placeholder="00000-000"
                                        className={fieldClass('cep')}
                                        required
                                    />
                                    <InputError message={errors.cep} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="street">Rua</Label>
                                    <Input
                                        id="street"
                                        value={data.street}
                                        onChange={(e) =>
                                            setData('street', e.target.value)
                                        }
                                        className={fieldClass('street')}
                                        required
                                    />
                                    <InputError message={errors.street} />
                                </div>
                                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="number">Número</Label>
                                        <Input
                                            id="number"
                                            value={data.number}
                                            onChange={(e) =>
                                                setData(
                                                    'number',
                                                    e.target.value,
                                                )
                                            }
                                            className={fieldClass('number')}
                                            required
                                        />
                                        <InputError message={errors.number} />
                                    </div>
                                    <div className="grid gap-2">
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
                                        <InputError
                                            message={errors.complement}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
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
                                        className={fieldClass('neighborhood')}
                                        required
                                    />
                                    <InputError message={errors.neighborhood} />
                                </div>
                                <div className="grid grid-cols-[minmax(0,1fr)_80px] gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="city">Cidade</Label>
                                        <Input
                                            id="city"
                                            value={data.city}
                                            onChange={(e) =>
                                                setData('city', e.target.value)
                                            }
                                            className={fieldClass('city')}
                                            required
                                        />
                                        <InputError message={errors.city} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="state">UF</Label>
                                        <Input
                                            id="state"
                                            maxLength={2}
                                            value={data.state}
                                            onChange={(e) =>
                                                setData(
                                                    'state',
                                                    e.target.value.toUpperCase(),
                                                )
                                            }
                                            className={fieldClass('state')}
                                            required
                                        />
                                        <InputError message={errors.state} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button type="submit" disabled={processing}>
                            {processing && (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                            )}
                            Salvar perfil
                        </Button>

                        {recentlySuccessful && (
                            <span className="inline-flex items-center gap-1.5 text-sm text-secondary-foreground">
                                <CheckCircle2 className="size-4" />
                                Salvo
                            </span>
                        )}
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
