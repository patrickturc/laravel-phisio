export interface TenantStatusInfo {
    status: string;
    access_status?: string;
    trial_days_left?: number | null;
    plan?: string;
}

const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    trial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    trial_expired: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    inactive: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
};

/**
 * Shows the effective access status of an organization: a trial that is still
 * running reads as "Trial · N dias", an expired one is called out separately
 * from a suspension, since the cause and the fix are different.
 */
export function TenantStatusBadge({ tenant }: { tenant: TenantStatusInfo }) {
    const state = tenant.access_status ?? tenant.status;

    const label =
        state === 'trial'
            ? `Trial · ${tenant.trial_days_left ?? 0}d`
            : state === 'trial_expired'
              ? 'Trial expirado'
              : state === 'active'
                ? 'Ativa'
                : state === 'suspended'
                  ? 'Suspensa'
                  : 'Inativa';

    return (
        <span
            className={`inline-block whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${styles[state] ?? styles.inactive}`}
        >
            {label}
        </span>
    );
}
