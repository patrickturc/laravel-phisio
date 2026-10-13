import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PILATES_SCALES } from '@/lib/pilates-scales';

export interface PilatesEvolutionData {
    estabilidade: string;
    mobilidade: string;
    forca: string;
    coordenacao: string;
    tem_dor: boolean;
    dor_eva: string;
    localizacao_dor: string;
    tem_limitacao: boolean;
    limitacao_detalhe: string;
    tem_contraindicacao: boolean;
    contraindicacao_detalhe: string;
    observacoes: string;
}

interface Props {
    data: PilatesEvolutionData;
    setField: <K extends keyof PilatesEvolutionData>(
        key: K,
        value: PilatesEvolutionData[K],
    ) => void;
    errors: Partial<Record<string, string>>;
}

const selectClass =
    'flex h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none';
const textareaClass =
    'flex w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[80px] resize-y';
const sectionTitleClass =
    'border-b pb-2 text-sm font-semibold tracking-wide text-primary uppercase';

function YesNo({
    name,
    label,
    value,
    onChange,
}: {
    name: string;
    label: string;
    value: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4 sm:justify-start">
            <span className="w-36 text-sm font-medium text-foreground">
                {label}
            </span>
            <div className="flex items-center gap-5">
                {[
                    { value: false, label: 'Não' },
                    { value: true, label: 'Sim' },
                ].map((option) => (
                    <label
                        key={option.label}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                        <input
                            type="radio"
                            name={name}
                            checked={value === option.value}
                            onChange={() => onChange(option.value)}
                            className="size-4 accent-primary"
                        />
                        {option.label}
                    </label>
                ))}
            </div>
        </div>
    );
}

/**
 * Structured Pilates evolution: movement execution ratings, complaints and
 * precautions, and general notes. Rendered by EvolutionFormSheet when the
 * "pilates" model is selected.
 */
export default function PilatesEvolutionFields({
    data,
    setField,
    errors,
}: Props) {
    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <h3 className={sectionTitleClass}>1. Execução do movimento</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {PILATES_SCALES.map((scale) => (
                        <div key={scale.field} className="grid gap-2">
                            <Label htmlFor={scale.field}>{scale.label} *</Label>
                            <select
                                id={scale.field}
                                value={data[scale.field]}
                                onChange={(e) =>
                                    setField(scale.field, e.target.value)
                                }
                                className={selectClass}
                                required
                            >
                                <option value="">Selecione</option>
                                {scale.options.map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors[scale.field]} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <h3 className={sectionTitleClass}>2. Queixas e cuidados</h3>

                <div className="space-y-3">
                    <YesNo
                        name="tem_dor"
                        label="Dor?"
                        value={data.tem_dor}
                        onChange={(value) => setField('tem_dor', value)}
                    />
                    {data.tem_dor && (
                        <div className="grid grid-cols-1 gap-4 rounded-xl border border-border/60 bg-muted/30 p-4 sm:grid-cols-[120px_1fr]">
                            <div className="grid gap-2">
                                <Label htmlFor="dor_eva">EVA (0–10)</Label>
                                <Input
                                    id="dor_eva"
                                    type="number"
                                    min={0}
                                    max={10}
                                    value={data.dor_eva}
                                    onChange={(e) =>
                                        setField('dor_eva', e.target.value)
                                    }
                                    className="border-neutral-200 bg-neutral-50"
                                />
                                <InputError message={errors.dor_eva} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="localizacao_dor">
                                    Onde dói?
                                </Label>
                                <Input
                                    id="localizacao_dor"
                                    value={data.localizacao_dor}
                                    onChange={(e) =>
                                        setField(
                                            'localizacao_dor',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Ex.: lombar, ombro direito"
                                    className="border-neutral-200 bg-neutral-50"
                                />
                                <InputError message={errors.localizacao_dor} />
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <YesNo
                        name="tem_limitacao"
                        label="Limitação?"
                        value={data.tem_limitacao}
                        onChange={(value) => setField('tem_limitacao', value)}
                    />
                    {data.tem_limitacao && (
                        <div className="grid gap-2">
                            <textarea
                                value={data.limitacao_detalhe}
                                onChange={(e) =>
                                    setField(
                                        'limitacao_detalhe',
                                        e.target.value,
                                    )
                                }
                                className={textareaClass}
                                placeholder="Descreva a limitação observada..."
                            />
                            <InputError message={errors.limitacao_detalhe} />
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <YesNo
                        name="tem_contraindicacao"
                        label="Contraindicação?"
                        value={data.tem_contraindicacao}
                        onChange={(value) =>
                            setField('tem_contraindicacao', value)
                        }
                    />
                    {data.tem_contraindicacao && (
                        <div className="grid gap-2">
                            <textarea
                                value={data.contraindicacao_detalhe}
                                onChange={(e) =>
                                    setField(
                                        'contraindicacao_detalhe',
                                        e.target.value,
                                    )
                                }
                                className={textareaClass}
                                placeholder="Exercícios ou movimentos a evitar..."
                            />
                            <InputError
                                message={errors.contraindicacao_detalhe}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <h3 className={sectionTitleClass}>3. Observações gerais</h3>
                <div className="grid gap-2">
                    <textarea
                        value={data.observacoes}
                        onChange={(e) =>
                            setField('observacoes', e.target.value)
                        }
                        className={textareaClass}
                        placeholder="Exercícios realizados, aparelhos, progressões, como o aluno respondeu..."
                    />
                    <InputError message={errors.observacoes} />
                </div>
            </div>
        </div>
    );
}
