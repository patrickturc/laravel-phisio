import { Activity } from 'lucide-react';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary-foreground text-sidebar-primary-foreground shadow-sm">
                <Activity className="size-5" />
            </div>
            <div className="ml-2 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate bg-gradient-to-r from-primary to-secondary-foreground bg-clip-text text-xl leading-tight font-extrabold tracking-tight text-transparent">
                    Phisio
                </span>
            </div>
        </>
    );
}
