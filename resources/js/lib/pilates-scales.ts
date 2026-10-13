/**
 * Pilates movement assessment scales. Mirrors Evolution::PILATES_SCALES in
 * app/Models/Evolution.php — keep both in sync.
 */
export type PilatesField =
    | 'estabilidade'
    | 'mobilidade'
    | 'forca'
    | 'coordenacao';

export interface PilatesScale {
    field: PilatesField;
    label: string;
    short: string;
    /** Best to worst. */
    options: Array<{ value: string; label: string }>;
}

export const PILATES_SCALES: PilatesScale[] = [
    {
        field: 'estabilidade',
        label: 'Estabilidade',
        short: 'Estab.',
        options: [
            { value: 'excelente', label: 'Excelente' },
            { value: 'boa', label: 'Boa' },
            { value: 'regular', label: 'Regular' },
            { value: 'comprometida', label: 'Comprometida' },
        ],
    },
    {
        field: 'mobilidade',
        label: 'Mobilidade',
        short: 'Mob.',
        options: [
            { value: 'excelente', label: 'Excelente' },
            { value: 'boa', label: 'Boa' },
            { value: 'regular', label: 'Regular' },
            { value: 'restrita', label: 'Restrita' },
        ],
    },
    {
        field: 'forca',
        label: 'Força',
        short: 'Força',
        options: [
            { value: 'excelente', label: 'Excelente' },
            { value: 'adequada', label: 'Adequada' },
            { value: 'regular', label: 'Regular' },
            { value: 'baixa', label: 'Baixa' },
        ],
    },
    {
        field: 'coordenacao',
        label: 'Coordenação',
        short: 'Coord.',
        options: [
            { value: 'excelente', label: 'Excelente' },
            { value: 'boa', label: 'Boa' },
            { value: 'regular', label: 'Regular' },
            { value: 'insuficiente', label: 'Insuficiente' },
        ],
    },
];

export const EVOLUTION_TYPE_LABELS: Record<string, string> = {
    soap: 'SOAP',
    simple: 'Evolução rápida',
    pilates: 'Pilates',
};

const TONE_CLASSES = [
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
];

export function pilatesLabel(
    field: PilatesField,
    value: string | null | undefined,
): string | null {
    if (!value) return null;

    const scale = PILATES_SCALES.find((s) => s.field === field);

    return scale?.options.find((o) => o.value === value)?.label ?? value;
}

/** Badge classes from green (best rating) to red (worst). */
export function pilatesToneClass(
    field: PilatesField,
    value: string | null | undefined,
): string {
    const scale = PILATES_SCALES.find((s) => s.field === field);
    const index = scale?.options.findIndex((o) => o.value === value) ?? -1;

    return index >= 0 ? TONE_CLASSES[index] : 'bg-muted text-muted-foreground';
}

/** "Estab. Boa · Mob. Boa · Força Adequada · Coord. Boa" */
export function pilatesSummary(
    evolution: Partial<Record<PilatesField, string | null>>,
): string {
    return PILATES_SCALES.map((s) => {
        const label = pilatesLabel(s.field, evolution[s.field]);

        return label ? `${s.short} ${label}` : null;
    })
        .filter(Boolean)
        .join(' · ');
}
