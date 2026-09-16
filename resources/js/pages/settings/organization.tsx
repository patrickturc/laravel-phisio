import { Head, useForm } from '@inertiajs/react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type TenantForm = {
    name: string;
    legal_name: string;
    document: string;
    state_registration: string;
    email: string;
    phone: string;
    whatsapp: string;
    website: string;
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
    tenant: Partial<TenantForm>;
    missingFields: string[];
    requiredFields: string[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Configurações', href: '/settings/organization' },
    { title: 'Dados da Clínica', href: '/settings/organization' },
];

export default function Organization({ tenant, missingFields }: Props) {
    const [loadingCep, setLoadingCep] = useState(false);

    const { data, setData, patch, processing, errors, recentlySuccessful } =
        useForm<TenantForm>({
            name: tenant.name ?? '',
            legal_name: tenant.legal_name ?? '',
            document: tenant.document ?? '',
            state_registration: tenant.state_registration ?? '',
            email: tenant.email ?? '',
            phone: tenant.phone ?? '',
            whatsapp: tenant.whatsapp ?? '',
            website: tenant.website ?? '',
            cep: tenant.cep ?? '',
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
                    cep: digits,
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
            <Head title="Dados da Clínica" />

            <div className="mx-auto flex h-full w-full max-w-4xl flex-1 flex-col gap-6 p-6 md:p-10">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Dados da Clínica
                    </h1>
                    <p className="mt-1 text-muted-foreground">
                        Usados nos seus documentos, recibos e na contratação do
                        plano.
                    </p>
                </div>

                {missingFields.length > 0 && (
                    <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
                        Os campos destacados ainda precisam ser preenchidos para
                        concluir o cadastro.
                    </p>
                )}

                <form onSubmit={submit} className="space-y-10">
                    <div className="space-y-6 rounded-xl border border-border bg-card p-6">
                        <Heading
                            variant="small"
                            title="Identificação"
                            description="Nome e documento da organização."
                        />

                        <div className="grid gap-2">
                            <Label htmlFor="name">Nome fantasia</Label>
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
                            <Label htmlFor="legal_name">Razão social</Label>
                            <Input
                                id="legal_name"
                                value={data.legal_name}
                                onChange={(e) =>
                                    setData('legal_name', e.target.value)
                                }
                            />
                            <InputError message={errors.legal_name} />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="document">CNPJ ou CPF</Label>
                                <Input
                                    id="document"
                                    value={data.document}
                                    onChange={(e) =>
                                        setData('document', e.target.value)
                                    }
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
                    </div>

                    <div className="space-y-6 rounded-xl border border-border bg-card p-6">
                        <Heading
                            variant="small"
                            title="Contato"
                            description="Como falamos com a sua clínica."
                        />

                        <div className="grid gap-4 sm:grid-cols-2">
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
                                        setData('phone', e.target.value)
                                    }
                                    required
                                />
                                <InputError message={errors.phone} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="whatsapp">WhatsApp</Label>
                                <Input
                                    id="whatsapp"
                                    value={data.whatsapp}
                                    onChange={(e) =>
                                        setData('whatsapp', e.target.value)
                                    }
                                />
                                <InputError message={errors.whatsapp} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="website">Site</Label>
                                <Input
                                    id="website"
                                    value={data.website}
                                    onChange={(e) =>
                                        setData('website', e.target.value)
                                    }
                                />
                                <InputError message={errors.website} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 rounded-xl border border-border bg-card p-6">
                        <Heading
                            variant="small"
                            title="Endereço"
                            description="Informe o CEP para preencher automaticamente."
                        />

                        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
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
                                        setData('cep', e.target.value)
                                    }
                                    onBlur={(e) => lookupCep(e.target.value)}
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
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="number">Número</Label>
                                <Input
                                    id="number"
                                    value={data.number}
                                    onChange={(e) =>
                                        setData('number', e.target.value)
                                    }
                                    className={fieldClass('number')}
                                    required
                                />
                                <InputError message={errors.number} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="complement">Complemento</Label>
                                <Input
                                    id="complement"
                                    value={data.complement}
                                    onChange={(e) =>
                                        setData('complement', e.target.value)
                                    }
                                />
                                <InputError message={errors.complement} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="neighborhood">Bairro</Label>
                                <Input
                                    id="neighborhood"
                                    value={data.neighborhood}
                                    onChange={(e) =>
                                        setData('neighborhood', e.target.value)
                                    }
                                    className={fieldClass('neighborhood')}
                                    required
                                />
                                <InputError message={errors.neighborhood} />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
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

                    <div className="space-y-6 rounded-xl border border-border bg-card p-6">
                        <Heading
                            variant="small"
                            title="Responsável técnico"
                            description="Profissional responsável pela clínica junto ao conselho."
                        />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="technical_manager_name">
                                    Nome
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
                                    Registro (CREFITO)
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
                                    message={errors.technical_manager_document}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button type="submit" disabled={processing}>
                            {processing && (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                            )}
                            Salvar dados
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
