import { useForm } from '@inertiajs/react';
import {
    Tag,
    Calendar as CalendarIcon,
    DollarSign,
    Repeat,
    Save,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { BILLING_CYCLES, billingCycleLabel, formatDateBR } from '@/lib/billing';

interface MembershipFormSheetProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    patients: any[];
    commercialPlans: any[];
    editingMembership?: any;
    initialPatientId?: string;
}

const inputClass =
    'h-11 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none';

function today(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${now.getFullYear()}-${month}-${day}`;
}

function dateOnly(value: string | null | undefined): string {
    return value ? value.split('T')[0] : '';
}

export function MembershipFormSheet({
    isOpen,
    setIsOpen,
    patients,
    commercialPlans,
    editingMembership,
    initialPatientId,
}: MembershipFormSheetProps) {
    const isEditMode = !!editingMembership;

    const blank = {
        patient_id: initialPatientId || '',
        commercial_plan_id: '',
        plan_name: '',
        start_date: today(),
        end_date: '',
        open_ended: true,
        price: '',
        status: 'active',
        billing_cycle: 'monthly',
        // First due date when creating, next one when editing.
        due_date: today(),
    };

    const {
        data,
        setData,
        transform,
        post,
        put,
        processing,
        errors,
        clearErrors,
    } = useForm(blank);

    useEffect(() => {
        if (!isOpen) return;

        clearErrors();
        setData(
            editingMembership
                ? {
                      patient_id: editingMembership.patient_id || '',
                      commercial_plan_id:
                          editingMembership.commercial_plan_id || '',
                      plan_name: editingMembership.plan_name || '',
                      start_date: dateOnly(editingMembership.start_date),
                      end_date: dateOnly(editingMembership.end_date),
                      open_ended: !editingMembership.end_date,
                      price: editingMembership.price || '',
                      status: editingMembership.status || 'active',
                      billing_cycle: editingMembership.billing_cycle ?? '',
                      due_date: dateOnly(editingMembership.next_billing_date),
                  }
                : blank,
        );
    }, [isOpen, editingMembership, initialPatientId]);

    const handlePlanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const planId = e.target.value;
        const selectedPlan = commercialPlans.find((p) => p.id === planId);

        if (!selectedPlan) {
            setData('commercial_plan_id', '');

            return;
        }

        setData((current) => {
            let endDate = current.end_date;
            if (selectedPlan.duration_months && current.start_date) {
                const end = new Date(`${current.start_date}T12:00:00`);
                end.setMonth(end.getMonth() + selectedPlan.duration_months);
                end.setDate(end.getDate() - 1);
                endDate = end.toISOString().split('T')[0];
            }

            return {
                ...current,
                commercial_plan_id: planId,
                plan_name: selectedPlan.name,
                price: selectedPlan.price,
                end_date: endDate,
                open_ended: selectedPlan.duration_months
                    ? false
                    : current.open_ended,
                // A plan only suggests a cycle when it has one set.
                billing_cycle:
                    selectedPlan.billing_cycle || current.billing_cycle,
            };
        });
    };

    function submitForm(e: FormEvent) {
        e.preventDefault();

        transform((form) => ({
            patient_id: form.patient_id,
            commercial_plan_id: form.commercial_plan_id || null,
            plan_name: form.plan_name,
            start_date: form.start_date,
            end_date: form.open_ended ? null : form.end_date,
            price: form.price,
            status: form.status,
            billing_cycle: form.billing_cycle || null,
            ...(isEditMode
                ? { next_billing_date: form.due_date || null }
                : { first_due_date: form.due_date || form.start_date }),
        }));

        const options = {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => setIsOpen(false),
        };

        if (isEditMode) {
            put(`/memberships/${editingMembership.id}`, options);
        } else {
            post('/memberships', options);
        }
    }

    const recurring = data.billing_cycle !== '';
    const dueLabel = isEditMode ? 'Próximo vencimento' : 'Primeiro vencimento';

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent
                side="right"
                className="w-full overflow-y-auto border-l-border/50 sm:max-w-md"
            >
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-2xl font-bold tracking-tight text-foreground">
                        {isEditMode ? 'Editar Matrícula' : 'Nova Matrícula'}
                    </SheetTitle>
                    <p className="text-sm text-muted-foreground">
                        {isEditMode
                            ? 'Atualize os dados do plano do aluno.'
                            : 'Crie um novo plano ou pacote para o aluno.'}
                    </p>
                </SheetHeader>

                <form onSubmit={submitForm} className="space-y-5 px-4 pb-8">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            Aluno
                        </label>
                        <select
                            value={data.patient_id}
                            onChange={(e) =>
                                setData('patient_id', e.target.value)
                            }
                            className={inputClass}
                            required
                            disabled={!!initialPatientId || isEditMode}
                        >
                            <option value="">Selecione o aluno...</option>
                            {patients.map((p: any) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                        {errors.patient_id && (
                            <p className="mt-1 text-sm text-red-500">
                                {errors.patient_id}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            Pacote Comercial
                        </label>
                        <div className="relative">
                            <Tag className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <select
                                value={data.commercial_plan_id || ''}
                                onChange={handlePlanChange}
                                className={`${inputClass} pl-10`}
                                required
                            >
                                <option value="">Selecione um pacote...</option>
                                {commercialPlans.map((p: any) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {errors.commercial_plan_id && (
                            <p className="mt-1 text-sm text-red-500">
                                {errors.commercial_plan_id}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            Status
                        </label>
                        <select
                            value={data.status}
                            onChange={(e) => setData('status', e.target.value)}
                            className={inputClass}
                            disabled={data.status === 'paused'}
                            required
                        >
                            <option value="active">Ativa</option>
                            {data.status === 'paused' && (
                                <option value="paused">Pausada</option>
                            )}
                            <option value="expired">Vencida</option>
                            <option value="cancelled">Cancelada</option>
                        </select>
                        {data.status === 'paused' && (
                            <p className="text-xs text-muted-foreground">
                                Use "Retomar" na matrícula para tirar da pausa.
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Início do Plano
                            </label>
                            <div className="relative">
                                <CalendarIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="date"
                                    value={data.start_date}
                                    onChange={(e) =>
                                        setData('start_date', e.target.value)
                                    }
                                    className={`${inputClass} pl-10`}
                                    required
                                />
                            </div>
                            {errors.start_date && (
                                <p className="mt-1 text-sm text-red-500">
                                    {errors.start_date}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Fim do Plano
                            </label>
                            <div className="relative">
                                <CalendarIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="date"
                                    value={data.open_ended ? '' : data.end_date}
                                    onChange={(e) =>
                                        setData('end_date', e.target.value)
                                    }
                                    className={`${inputClass} pl-10 disabled:opacity-50`}
                                    disabled={data.open_ended}
                                    required={!data.open_ended}
                                />
                            </div>
                            {errors.end_date && (
                                <p className="mt-1 text-sm text-red-500">
                                    {errors.end_date}
                                </p>
                            )}
                        </div>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={data.open_ended}
                            onChange={(e) =>
                                setData('open_ended', e.target.checked)
                            }
                            className="size-4 accent-primary"
                        />
                        Sem data de fim (matrícula contínua)
                    </label>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                {recurring ? 'Valor por cobrança' : 'Valor'}
                            </label>
                            <div className="relative">
                                <DollarSign className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="150.00"
                                    value={data.price}
                                    onChange={(e) =>
                                        setData('price', e.target.value)
                                    }
                                    className={`${inputClass} pl-10`}
                                    required
                                />
                            </div>
                            {errors.price && (
                                <p className="mt-1 text-sm text-red-500">
                                    {errors.price}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Cobrança
                            </label>
                            <div className="relative">
                                <Repeat className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <select
                                    value={data.billing_cycle}
                                    onChange={(e) =>
                                        setData('billing_cycle', e.target.value)
                                    }
                                    className={`${inputClass} pl-10`}
                                >
                                    <option value="">Única</option>
                                    {BILLING_CYCLES.map((cycle) => (
                                        <option
                                            key={cycle.value}
                                            value={cycle.value}
                                        >
                                            {cycle.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {errors.billing_cycle && (
                                <p className="mt-1 text-sm text-red-500">
                                    {errors.billing_cycle}
                                </p>
                            )}
                        </div>
                    </div>

                    {(!isEditMode || recurring) && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                {dueLabel}
                            </label>
                            <div className="relative">
                                <CalendarIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="date"
                                    value={data.due_date}
                                    onChange={(e) =>
                                        setData('due_date', e.target.value)
                                    }
                                    className={`${inputClass} pl-10`}
                                />
                            </div>
                        </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                        {recurring
                            ? `${billingCycleLabel(data.billing_cycle)}: ${isEditMode ? 'a próxima cobrança vence' : 'a primeira cobrança é gerada agora, com vencimento'} em ${formatDateBR(data.due_date) || '—'}, e as seguintes são geradas automaticamente${data.open_ended ? '' : ' até o fim do plano'}.`
                            : 'Uma única cobrança, gerada ao salvar.'}
                    </p>

                    <div className="flex justify-end gap-3 border-t border-border/50 pt-6">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="flex h-11 items-center justify-center rounded-xl border border-border bg-card px-6 font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
                        >
                            <Save className="size-4" />
                            {isEditMode
                                ? 'Salvar Alterações'
                                : 'Salvar Matrícula'}
                        </button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
