import { router } from '@inertiajs/react';

/**
 * The patient details open as a modal over whatever screen is showing: the
 * URL gains ?patient={id} (and ?patient_tab=…), and the server sends the
 * record in the shared "patientDetails" prop. Saving something inside the
 * modal comes back to the same URL, so the modal stays open with fresh data.
 */
function visitWith(params: Record<string, string | null>): void {
    const url = new URL(window.location.href);

    Object.entries(params).forEach(([key, value]) =>
        value === null
            ? url.searchParams.delete(key)
            : url.searchParams.set(key, value),
    );

    router.visit(`${url.pathname}${url.search}`, {
        only: ['patientDetails'],
        preserveState: true,
        preserveScroll: true,
    });
}

export function openPatientDetails(patientId: string, tab?: string): void {
    visitWith({ patient: patientId, patient_tab: tab ?? null });
}

export function closePatientDetails(): void {
    visitWith({ patient: null, patient_tab: null });
}

/**
 * Link target for opening the patient in a new tab: the server turns it into
 * the patient list with the modal open.
 */
export function patientDetailsHref(patientId: string, tab?: string): string {
    return `/patients/${patientId}${tab ? `?tab=${tab}` : ''}`;
}
