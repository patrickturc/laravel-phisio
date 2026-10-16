import { usePage } from '@inertiajs/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import { PatientDetails } from '@/components/patient-details';
import type {
    FinancialSummary,
    PatientDetailsPatient,
    PatientTab,
} from '@/components/patient-details';
import { closePatientDetails } from '@/lib/patient-details';

interface PatientDetailsProps {
    patient: PatientDetailsPatient;
    protocols: Array<{ id: string; name: string }>;
    commercialPlans: any[];
    financialSummary: FinancialSummary | null;
}

/**
 * The patient details modal, mounted once in the app layout and opened from
 * any screen through openPatientDetails() / <PatientLink>.
 */
export function PatientDetailsModal() {
    const { props, url } = usePage<{
        patientDetails?: PatientDetailsProps | null;
    }>();
    const details = props.patientDetails;

    if (!details) {
        return null;
    }

    const initialTab =
        (new URLSearchParams(url.split('?')[1]).get(
            'patient_tab',
        ) as PatientTab | null) ?? 'info';

    return (
        <DialogPrimitive.Root
            open
            onOpenChange={(open) => !open && closePatientDetails()}
        >
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
                {/* No transform on the content: the confirm and document
                    preview overlays inside it are position: fixed. */}
                <DialogPrimitive.Content
                    aria-describedby={undefined}
                    className="fixed inset-2 z-50 mx-auto flex max-w-5xl flex-col overflow-hidden rounded-2xl border border-border/50 bg-background shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 sm:inset-6"
                >
                    <DialogPrimitive.Title className="sr-only">
                        {details.patient.name}
                    </DialogPrimitive.Title>
                    <div className="flex-1 overflow-y-auto">
                        <PatientDetails
                            key={details.patient.id}
                            patient={details.patient}
                            protocols={details.protocols}
                            commercialPlans={details.commercialPlans}
                            financialSummary={details.financialSummary}
                            initialTab={initialTab}
                        />
                    </div>
                    <DialogPrimitive.Close
                        className="absolute top-4 right-4 rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                        title="Fechar"
                    >
                        <XIcon className="size-5" />
                        <span className="sr-only">Fechar</span>
                    </DialogPrimitive.Close>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
