import { usePage } from '@inertiajs/react';

export function useTenantFeatures() {
    const { auth } = usePage<any>().props;
    const features = auth?.user?.tenant?.features || {};

    const hasFeature = (feature: string): boolean => {
        // If tenant has no custom settings or feature is undefined, default to true
        if (features && features[feature] === false) {
            return false;
        }
        return true;
    };

    return { hasFeature, features, tenant: auth?.user?.tenant };
}
