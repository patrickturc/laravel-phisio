import { useForm } from '@inertiajs/react';
import { User, Phone, MapPin, Heart } from 'lucide-react';
import { useEffect } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';

export interface Patient {
    id: string;
    name: string;
    nickname: string | null;
    birthdate: string | null;
    gender: string | null;
    phone: string | null;
    email: string | null;
    type: 'pilates' | 'physiotherapy';
    cpf: string | null;
    rg: string | null;
    profession: string | null;
    address: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    health_notes: string | null;
    cep: string | null;
    street: string | null;
    number: string | null;
    complement: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
}

interface PatientFormSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patient?: Patient | null;
}

export function PatientFormSheet({
    open,
    onOpenChange,
    patient,
}: PatientFormSheetProps) {
    const isEditing = !!patient;

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm({
            name: patient?.name || '',
            nickname: patient?.nickname || '',
            birthdate: patient?.birthdate || '',
            gender: patient?.gender || '',
            phone: patient?.phone || '',
            email: patient?.email || '',
            type: patient?.type || 'pilates',
            cpf: patient?.cpf || '',
            rg: patient?.rg || '',
            profession: patient?.profession || '',
            address: patient?.address || '',
            emergency_contact_name: patient?.emergency_contact_name || '',
            emergency_contact_phone: patient?.emergency_contact_phone || '',
            health_notes: patient?.health_notes || '',
            cep: patient?.cep || '',
            street: patient?.street || '',
            number: patient?.number || '',
            complement: patient?.complement || '',
            neighborhood: patient?.neighborhood || '',
            city: patient?.city || '',
            state: patient?.state || '',
        });

    useEffect(() => {
        if (open) {
            reset();
            clearErrors();
        }
    }, [open]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const options = {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => onOpenChange(false),
        };
        if (isEditing) {
            put(`/patients/${patient.id}`, options);
        } else {
            post('/patients', options);
        }
    }

    const maskCPF = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    };

    const maskPhone = (value: string) => {
        return value
            .replace(/\D/g, '')
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
        const maskedCep = maskCEP(e.target.value);
        setData('cep', maskedCep);

        if (maskedCep.length === 9) {
            try {
                const response = await fetch(
                    `https://viacep.com.br/ws/${maskedCep.replace('-', '')}/json/`,
                );
                const json = await response.json();
                if (!json.erro) {
                    setData((data) => ({
                        ...data,
                        street: json.logradouro || data.street,
                        neighborhood: json.bairro || data.neighborhood,
                        city: json.localidade || data.city,
                        state: json.uf || data.state,
                    }));
                }
            } catch (error) {
                console.error('Erro ao buscar CEP:', error);
            }
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full overflow-y-auto sm:max-w-xl md:max-w-2xl"
            >
                <SheetHeader className="mb-6">
                    <SheetTitle>
                        {isEditing ? 'Editar Paciente' : 'Novo Paciente'}
                    </SheetTitle>
                    <SheetDescription>
                        {isEditing
                            ? 'Edite as informações do paciente abaixo.'
                            : 'Preencha os dados abaixo para cadastrar um paciente.'}
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pb-8">
                    {/* ── Dados Pessoais ── */}
                    <div className="space-y-5">
                        <div className="mb-1 flex items-center gap-2 text-base font-bold text-foreground">
                            <User className="size-5 text-primary" />
                            Dados Pessoais
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="name">Nome completo *</Label>
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

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="nickname">
                                    Nome curto (apelido)
                                </Label>
                                <Input
                                    id="nickname"
                                    value={data.nickname}
                                    onChange={(e) =>
                                        setData('nickname', e.target.value)
                                    }
                                />
                                <InputError message={errors.nickname} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="birthdate">
                                    Data de Nascimento
                                </Label>
                                <Input
                                    id="birthdate"
                                    type="date"
                                    value={data.birthdate}
                                    onChange={(e) =>
                                        setData('birthdate', e.target.value)
                                    }
                                />
                                <InputError message={errors.birthdate} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                            <div className="grid gap-2">
                                <Label htmlFor="gender">Sexo</Label>
                                <select
                                    id="gender"
                                    value={data.gender}
                                    onChange={(e) =>
                                        setData('gender', e.target.value)
                                    }
                                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                >
                                    <option value="">Não informado</option>
                                    <option value="female">Feminino</option>
                                    <option value="male">Masculino</option>
                                    <option value="other">Outro</option>
                                </select>
                                <InputError message={errors.gender} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="cpf">CPF</Label>
                                <Input
                                    id="cpf"
                                    value={data.cpf}
                                    onChange={(e) =>
                                        setData('cpf', maskCPF(e.target.value))
                                    }
                                    placeholder="000.000.000-00"
                                    maxLength={14}
                                />
                                <InputError message={errors.cpf} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="rg">RG</Label>
                                <Input
                                    id="rg"
                                    value={data.rg}
                                    onChange={(e) =>
                                        setData('rg', e.target.value)
                                    }
                                />
                                <InputError message={errors.rg} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="profession">Profissão</Label>
                                <Input
                                    id="profession"
                                    value={data.profession}
                                    onChange={(e) =>
                                        setData('profession', e.target.value)
                                    }
                                />
                                <InputError message={errors.profession} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="type">
                                    Tipo de atendimento *
                                </Label>
                                <select
                                    id="type"
                                    value={data.type}
                                    onChange={(e) =>
                                        setData(
                                            'type',
                                            e.target.value as
                                                | 'pilates'
                                                | 'physiotherapy',
                                        )
                                    }
                                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                >
                                    <option value="pilates">Pilates</option>
                                    <option value="physiotherapy">
                                        Fisioterapia
                                    </option>
                                </select>
                                <InputError message={errors.type} />
                            </div>
                        </div>
                    </div>

                    {/* ── Contato ── */}
                    <div className="space-y-5">
                        <div className="mb-1 flex items-center gap-2 text-base font-bold text-foreground">
                            <Phone className="size-5 text-primary" />
                            Contato
                        </div>

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
                                    placeholder="(11) 99999-9999"
                                    maxLength={15}
                                />
                                <InputError message={errors.phone} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">E-mail</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) =>
                                        setData('email', e.target.value)
                                    }
                                    placeholder="email@exemplo.com"
                                />
                                <InputError message={errors.email} />
                            </div>
                        </div>
                    </div>

                    {/* ── Endereço ── */}
                    <div className="space-y-5">
                        <div className="mb-1 flex items-center gap-2 text-base font-bold text-foreground">
                            <MapPin className="size-5 text-primary" />
                            Endereço
                        </div>

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                            <div className="grid gap-2">
                                <Label htmlFor="cep">CEP</Label>
                                <Input
                                    id="cep"
                                    value={data.cep}
                                    onChange={handleCepChange}
                                    placeholder="00000-000"
                                    maxLength={9}
                                />
                                <InputError message={errors.cep} />
                            </div>
                            <div className="grid gap-2 md:col-span-2">
                                <Label htmlFor="street">Logradouro</Label>
                                <Input
                                    id="street"
                                    value={data.street}
                                    onChange={(e) =>
                                        setData('street', e.target.value)
                                    }
                                />
                                <InputError message={errors.street} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                            <div className="grid gap-2">
                                <Label htmlFor="number">Número</Label>
                                <Input
                                    id="number"
                                    value={data.number}
                                    onChange={(e) =>
                                        setData('number', e.target.value)
                                    }
                                />
                                <InputError message={errors.number} />
                            </div>
                            <div className="grid gap-2 md:col-span-2">
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
                        </div>

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                            <div className="grid gap-2">
                                <Label htmlFor="neighborhood">Bairro</Label>
                                <Input
                                    id="neighborhood"
                                    value={data.neighborhood}
                                    onChange={(e) =>
                                        setData('neighborhood', e.target.value)
                                    }
                                />
                                <InputError message={errors.neighborhood} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="city">Cidade</Label>
                                <Input
                                    id="city"
                                    value={data.city}
                                    onChange={(e) =>
                                        setData('city', e.target.value)
                                    }
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
                                    placeholder="SP"
                                />
                                <InputError message={errors.state} />
                            </div>
                        </div>
                    </div>

                    {/* ── Emergência & Saúde ── */}
                    <div className="space-y-5">
                        <div className="mb-1 flex items-center gap-2 text-base font-bold text-foreground">
                            <Heart className="size-5 text-red-500" />
                            Contato de Emergência & Saúde
                        </div>

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="emergency_contact_name">
                                    Nome
                                </Label>
                                <Input
                                    id="emergency_contact_name"
                                    value={data.emergency_contact_name}
                                    onChange={(e) =>
                                        setData(
                                            'emergency_contact_name',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Nome completo"
                                />
                                <InputError
                                    message={errors.emergency_contact_name}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="emergency_contact_phone">
                                    Telefone
                                </Label>
                                <Input
                                    id="emergency_contact_phone"
                                    value={data.emergency_contact_phone}
                                    onChange={(e) =>
                                        setData(
                                            'emergency_contact_phone',
                                            maskPhone(e.target.value),
                                        )
                                    }
                                    placeholder="(11) 99999-9999"
                                    maxLength={15}
                                />
                                <InputError
                                    message={errors.emergency_contact_phone}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="health_notes">
                                Observações Clínicas / Restrições
                            </Label>
                            <textarea
                                id="health_notes"
                                value={data.health_notes}
                                onChange={(e) =>
                                    setData('health_notes', e.target.value)
                                }
                                rows={3}
                                className="flex w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                            />
                            <InputError message={errors.health_notes} />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-4 border-t border-border/50 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="rounded-xl"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing}
                            className="rounded-xl shadow-sm"
                        >
                            {processing
                                ? 'Salvando...'
                                : isEditing
                                  ? 'Salvar Alterações'
                                  : 'Cadastrar Paciente'}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
