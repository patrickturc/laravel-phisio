import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';

interface Evolution {
    id: string;
    paciente_id: string;
    clinical_protocol_id: string | null;
    data_atendimento: string;
    tipo_atendimento: string;
    queixa_principal: string | null;
    relato_paciente: string | null;
    dor_eva: number | null;
    localizacao_dor: string | null;
    tipo_dor: string | null;
    pressao_arterial: string | null;
    frequencia_cardiaca: string | null;
    saturacao: string | null;
    condutas_realizadas: string | null;
    analise_profissional: string | null;
    resposta_tratamento: string | null;
    conduta_planejada: string | null;
    orientacoes_domiciliares: string | null;
    observacoes: string | null;
}

interface Props {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    patientId?: string;
    patients?: Array<{ id: string; name: string; type?: string }>;
    protocols?: Array<{ id: string; name: string }>;
    evolution?: Evolution | null; // If provided, we're editing
    appointmentId?: string; // If provided, we're linking to an appointment
}

export default function EvolutionFormSheet({
    isOpen,
    onOpenChange,
    patientId = '',
    patients = [],
    protocols = [],
    evolution,
    appointmentId,
}: Props) {
    const isEdit = !!evolution;

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm({
            paciente_id: patientId,
            agendamento_id: appointmentId || '',
            clinical_protocol_id: '',
            data_atendimento: new Date().toISOString().split('T')[0],
            tipo_atendimento: 'sessao',
            queixa_principal: '',
            relato_paciente: '',
            dor_eva: '',
            localizacao_dor: '',
            tipo_dor: '',
            pressao_arterial: '',
            frequencia_cardiaca: '',
            saturacao: '',
            condutas_realizadas: '',
            analise_profissional: '',
            resposta_tratamento: '',
            conduta_planejada: '',
            orientacoes_domiciliares: '',
            evolution_type: 'soap',
            observacoes: '',
        });

    useEffect(() => {
        if (isOpen) {
            clearErrors();
            if (isEdit && evolution) {
                setData({
                    paciente_id: evolution.paciente_id,
                    clinical_protocol_id: evolution.clinical_protocol_id || '',
                    data_atendimento:
                        evolution.data_atendimento?.slice(0, 10) || '',
                    tipo_atendimento: evolution.tipo_atendimento,
                    queixa_principal: evolution.queixa_principal || '',
                    relato_paciente: evolution.relato_paciente || '',
                    dor_eva:
                        evolution.dor_eva != null
                            ? String(evolution.dor_eva)
                            : '',
                    localizacao_dor: evolution.localizacao_dor || '',
                    tipo_dor: evolution.tipo_dor || '',
                    pressao_arterial: evolution.pressao_arterial || '',
                    frequencia_cardiaca: evolution.frequencia_cardiaca || '',
                    saturacao: evolution.saturacao || '',
                    condutas_realizadas: evolution.condutas_realizadas || '',
                    analise_profissional: evolution.analise_profissional || '',
                    resposta_tratamento: evolution.resposta_tratamento || '',
                    conduta_planejada: evolution.conduta_planejada || '',
                    orientacoes_domiciliares:
                        evolution.orientacoes_domiciliares || '',
                    evolution_type: evolution.observacoes ? 'simple' : 'soap',
                    observacoes: evolution.observacoes || '',
                });
            } else {
                reset();
                setData((prev) => ({
                    ...prev,
                    paciente_id: patientId,
                    data_atendimento: new Date().toISOString().split('T')[0],
                    tipo_atendimento: 'sessao',
                    evolution_type: 'soap',
                }));
            }
        }
    }, [isOpen, isEdit, evolution, patientId]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const options = {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        };

        if (isEdit && evolution) {
            put(`/evolutions/${evolution.id}`, options);
        } else {
            post('/evolutions', options);
        }
    }

    const textareaClass =
        'flex w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[80px] resize-y';
    const selectedProtocol = protocols.find(
        (p) => p.id === data.clinical_protocol_id,
    );

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-xl md:max-w-2xl">
                <SheetHeader className="mb-6">
                    <SheetTitle>
                        {isEdit ? 'Editar Evolução' : 'Nova Evolução (SOAP)'}
                    </SheetTitle>
                    <SheetDescription>
                        {isEdit
                            ? 'Atualize os dados da evolução.'
                            : 'Registre a evolução clínica do paciente.'}
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pb-12">
                    <div className="space-y-4">
                        {!patientId && patients.length > 0 && !isEdit && (
                            <div className="grid gap-2">
                                <Label htmlFor="paciente_id">Paciente *</Label>
                                <select
                                    id="paciente_id"
                                    value={data.paciente_id}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const selectedPatient = patients.find(
                                            (p) => p.id === val,
                                        );
                                        setData((prev) => ({
                                            ...prev,
                                            paciente_id: val,
                                            evolution_type:
                                                selectedPatient?.type ===
                                                'pilates'
                                                    ? 'simple'
                                                    : 'soap',
                                        }));
                                    }}
                                    className="flex h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    required
                                >
                                    <option value="">
                                        Selecione o paciente
                                    </option>
                                    {patients.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.paciente_id} />
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="data_atendimento">Data *</Label>
                                <Input
                                    id="data_atendimento"
                                    type="date"
                                    value={data.data_atendimento}
                                    onChange={(e) =>
                                        setData(
                                            'data_atendimento',
                                            e.target.value,
                                        )
                                    }
                                    className="border-neutral-200 bg-neutral-50"
                                    required
                                />
                                <InputError message={errors.data_atendimento} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="evolution_type">
                                    Modelo de Evolução
                                </Label>
                                <select
                                    id="evolution_type"
                                    value={data.evolution_type}
                                    onChange={(e) =>
                                        setData(
                                            'evolution_type',
                                            e.target.value,
                                        )
                                    }
                                    className="flex h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                >
                                    <option value="soap">
                                        Fisioterapia (SOAP Completo)
                                    </option>
                                    <option value="simple">
                                        Pilates (Observações)
                                    </option>
                                </select>
                            </div>
                        </div>

                        {data.evolution_type === 'soap' && (
                            <div className="grid gap-2">
                                <Label htmlFor="tipo_atendimento">
                                    Tipo de Atendimento *
                                </Label>
                                <select
                                    id="tipo_atendimento"
                                    value={data.tipo_atendimento}
                                    onChange={(e) =>
                                        setData(
                                            'tipo_atendimento',
                                            e.target.value,
                                        )
                                    }
                                    className="flex h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                >
                                    <option value="sessao">Sessão</option>
                                    <option value="avaliacao">Avaliação</option>
                                    <option value="reavaliacao">
                                        Reavaliação
                                    </option>
                                </select>
                            </div>
                        )}

                        {data.evolution_type === 'soap' &&
                            protocols.length > 0 && (
                                <div className="grid gap-2">
                                    <Label htmlFor="clinical_protocol_id">
                                        Protocolo Clínico
                                    </Label>
                                    <select
                                        id="clinical_protocol_id"
                                        value={data.clinical_protocol_id}
                                        onChange={(e) =>
                                            setData(
                                                'clinical_protocol_id',
                                                e.target.value,
                                            )
                                        }
                                        className="flex h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    >
                                        <option value="">
                                            Nenhum (evolução avulsa)
                                        </option>
                                        {protocols.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedProtocol && (
                                        <div className="mt-1 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                                            <div className="flex-1">
                                                <span className="font-semibold text-foreground">
                                                    {selectedProtocol.name}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    <InputError
                                        message={errors.clinical_protocol_id}
                                    />
                                </div>
                            )}
                    </div>

                    {data.evolution_type === 'simple' ? (
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label>Observações da Aula</Label>
                                <textarea
                                    value={data.observacoes}
                                    onChange={(e) =>
                                        setData('observacoes', e.target.value)
                                    }
                                    className={textareaClass}
                                    placeholder="Anotações sobre a aula de Pilates, exercícios realizados, dificuldades..."
                                    required
                                />
                                <InputError message={errors.observacoes} />
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* S - Subjetivo */}
                            <div className="space-y-4">
                                <h3 className="border-b pb-2 font-semibold text-foreground">
                                    <span className="mr-1 text-primary">S</span>{' '}
                                    — Subjetivo
                                </h3>
                                <div className="grid gap-2">
                                    <Label>Queixa principal</Label>
                                    <textarea
                                        value={data.queixa_principal}
                                        onChange={(e) =>
                                            setData(
                                                'queixa_principal',
                                                e.target.value,
                                            )
                                        }
                                        className={textareaClass}
                                        placeholder="Descreva a queixa do paciente..."
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Relato do paciente</Label>
                                    <textarea
                                        value={data.relato_paciente}
                                        onChange={(e) =>
                                            setData(
                                                'relato_paciente',
                                                e.target.value,
                                            )
                                        }
                                        className={textareaClass}
                                        placeholder="O que o paciente relatou..."
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <div className="grid gap-2">
                                        <Label>EVA Dor (0-10)</Label>
                                        <Input
                                            type="number"
                                            value={data.dor_eva}
                                            onChange={(e) =>
                                                setData(
                                                    'dor_eva',
                                                    e.target.value,
                                                )
                                            }
                                            className="border-neutral-200 bg-neutral-50"
                                            min="0"
                                            max="10"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Localização</Label>
                                        <Input
                                            value={data.localizacao_dor}
                                            onChange={(e) =>
                                                setData(
                                                    'localizacao_dor',
                                                    e.target.value,
                                                )
                                            }
                                            className="border-neutral-200 bg-neutral-50"
                                            placeholder="Ex: lombar"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Tipo de dor</Label>
                                        <Input
                                            value={data.tipo_dor}
                                            onChange={(e) =>
                                                setData(
                                                    'tipo_dor',
                                                    e.target.value,
                                                )
                                            }
                                            className="border-neutral-200 bg-neutral-50"
                                            placeholder="Ex: aguda"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* O - Objetivo */}
                            <div className="space-y-4">
                                <h3 className="border-b pb-2 font-semibold text-foreground">
                                    <span className="mr-1 text-emerald-600">
                                        O
                                    </span>{' '}
                                    — Objetivo
                                </h3>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <div className="grid gap-2">
                                        <Label>PA</Label>
                                        <Input
                                            value={data.pressao_arterial}
                                            onChange={(e) =>
                                                setData(
                                                    'pressao_arterial',
                                                    e.target.value,
                                                )
                                            }
                                            className="border-neutral-200 bg-neutral-50"
                                            placeholder="120/80"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>FC</Label>
                                        <Input
                                            value={data.frequencia_cardiaca}
                                            onChange={(e) =>
                                                setData(
                                                    'frequencia_cardiaca',
                                                    e.target.value,
                                                )
                                            }
                                            className="border-neutral-200 bg-neutral-50"
                                            placeholder="72 bpm"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>SpO2</Label>
                                        <Input
                                            value={data.saturacao}
                                            onChange={(e) =>
                                                setData(
                                                    'saturacao',
                                                    e.target.value,
                                                )
                                            }
                                            className="border-neutral-200 bg-neutral-50"
                                            placeholder="98%"
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Condutas Realizadas</Label>
                                    <textarea
                                        value={data.condutas_realizadas}
                                        onChange={(e) =>
                                            setData(
                                                'condutas_realizadas',
                                                e.target.value,
                                            )
                                        }
                                        className={textareaClass}
                                        placeholder="Descreva condutas, exercícios realizados..."
                                    />
                                </div>
                            </div>

                            {/* A - Avaliação */}
                            <div className="space-y-4">
                                <h3 className="border-b pb-2 font-semibold text-foreground">
                                    <span className="mr-1 text-amber-600">
                                        A
                                    </span>{' '}
                                    — Avaliação
                                </h3>
                                <div className="grid gap-2">
                                    <Label>Análise do Profissional</Label>
                                    <textarea
                                        value={data.analise_profissional}
                                        onChange={(e) =>
                                            setData(
                                                'analise_profissional',
                                                e.target.value,
                                            )
                                        }
                                        className={textareaClass}
                                        placeholder="Sua análise sobre a evolução do quadro..."
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Resposta ao Tratamento</Label>
                                    <textarea
                                        value={data.resposta_tratamento}
                                        onChange={(e) =>
                                            setData(
                                                'resposta_tratamento',
                                                e.target.value,
                                            )
                                        }
                                        className={textareaClass}
                                        placeholder="Como o paciente respondeu à sessão..."
                                    />
                                </div>
                            </div>

                            {/* P - Plano */}
                            <div className="space-y-4">
                                <h3 className="border-b pb-2 font-semibold text-foreground">
                                    <span className="mr-1 text-indigo-600">
                                        P
                                    </span>{' '}
                                    — Plano
                                </h3>
                                <div className="grid gap-2">
                                    <Label>Conduta Planejada</Label>
                                    <textarea
                                        value={data.conduta_planejada}
                                        onChange={(e) =>
                                            setData(
                                                'conduta_planejada',
                                                e.target.value,
                                            )
                                        }
                                        className={textareaClass}
                                        placeholder="Plano para as próximas sessões..."
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Orientações Domiciliares</Label>
                                    <textarea
                                        value={data.orientacoes_domiciliares}
                                        onChange={(e) =>
                                            setData(
                                                'orientacoes_domiciliares',
                                                e.target.value,
                                            )
                                        }
                                        className={textareaClass}
                                        placeholder="Exercícios e orientações para casa..."
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="flex items-center justify-end gap-3 border-t pt-4">
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
                            className="rounded-xl"
                        >
                            {processing
                                ? 'Salvando...'
                                : isEdit
                                  ? 'Salvar Alterações'
                                  : 'Registrar Evolução'}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
