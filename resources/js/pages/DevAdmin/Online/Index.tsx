import { Head, Link, router, usePoll } from '@inertiajs/react';
import { Activity, Building2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import DevAdminLayout from '@/layouts/DevAdminLayout';

interface OnlineUser {
    id: number;
    name: string;
    email: string;
    role: string | null;
    tenant: { id: string; name: string } | null;
    path: string | null;
    last_seen_at: string | null;
}

// Screen names by URL prefix; the first match wins.
const SCREENS: Array<[string, string]> = [
    ['/dashboard', 'Painel inicial'],
    ['/appointments', 'Agenda'],
    ['/patients', 'Pacientes'],
    ['/celebrations', 'Aniversariantes'],
    ['/evolutions', 'Prontuário'],
    ['/group-classes', 'Turmas'],
    ['/memberships', 'Matrículas'],
    ['/commercial-plans', 'Planos e pacotes'],
    ['/financial', 'Financeiro'],
    ['/recurring-expenses', 'Gastos recorrentes'],
    ['/reports', 'Relatórios'],
    ['/clinical-protocols', 'Protocolos clínicos'],
    ['/settings/organization', 'Perfil da clínica'],
    ['/settings/schedule', 'Configurações da agenda'],
    ['/settings/billing', 'Plano da clínica'],
    ['/settings/users', 'Usuários'],
    ['/settings/roles', 'Perfis de acesso'],
    ['/settings', 'Configurações pessoais'],
    ['/assinatura', 'Assinatura'],
];

function screenName(path: string | null): string {
    if (!path) {
        return '—';
    }

    const [pathname, query] = path.split('?');
    const screen =
        SCREENS.find(([prefix]) => pathname.startsWith(prefix))?.[1] ??
        pathname;

    return query === 'patient' ? `${screen} · ficha do paciente` : screen;
}

function timeAgo(iso: string | null): string {
    if (!iso) {
        return '—';
    }

    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

    if (minutes < 1) {
        return 'agora';
    }

    if (minutes < 60) {
        return `há ${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);

    return hours < 24 ? `há ${hours} h` : `há ${Math.floor(hours / 24)} d`;
}

const WINDOW_LABELS: Record<number, string> = {
    5: 'Agora (5 min)',
    30: '30 min',
    60: '1 hora',
    1440: 'Hoje (24 h)',
};

export default function OnlineIndex({
    users,
    window,
    windows,
    clinics,
}: {
    users: OnlineUser[];
    window: number;
    windows: number[];
    clinics: number;
}) {
    // Keep the list current while the page is open.
    usePoll(30000, { only: ['users', 'clinics'] });

    function impersonate(user: OnlineUser) {
        if (
            user.tenant &&
            confirm(
                `Acessar "${user.tenant.name}" como ${user.name}? Você verá exatamente o que essa pessoa vê.`,
            )
        ) {
            router.post(`/dev-admin/tenants/${user.tenant.id}/impersonate`, {
                user_id: user.id,
            });
        }
    }

    return (
        <DevAdminLayout>
            <Head title="Usuários online" />

            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                        <Activity className="h-6 w-6 text-emerald-500" />
                        Usuários online
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Quem está usando o sistema, em qual tela e de qual
                        clínica. Atualiza sozinho a cada 30 segundos.
                    </p>
                </div>
                <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1">
                    {windows.map((minutes) => (
                        <button
                            key={minutes}
                            type="button"
                            onClick={() =>
                                router.get(
                                    '/dev-admin/online',
                                    { window: minutes },
                                    { preserveState: true, replace: true },
                                )
                            }
                            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                window === minutes
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {WINDOW_LABELS[minutes] ?? `${minutes} min`}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Usuários ativos</CardDescription>
                        <CardTitle className="text-3xl">
                            {users.length}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>
                            Clínicas com alguém online
                        </CardDescription>
                        <CardTitle className="text-3xl">{clinics}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Card>
                <CardContent className="p-0">
                    {users.length === 0 ? (
                        <p className="px-6 py-12 text-center text-sm text-muted-foreground">
                            Ninguém usou o sistema neste período.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Usuário</TableHead>
                                    <TableHead>Clínica</TableHead>
                                    <TableHead>Tela</TableHead>
                                    <TableHead>Visto</TableHead>
                                    <TableHead className="w-32" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <p className="font-medium">
                                                {user.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {user.email}
                                                {user.role && ` · ${user.role}`}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            {user.tenant ? (
                                                <Link
                                                    href={`/dev-admin/tenants/${user.tenant.id}`}
                                                    className="flex items-center gap-1.5 hover:text-primary hover:underline"
                                                >
                                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                    {user.tenant.name}
                                                </Link>
                                            ) : (
                                                '—'
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {screenName(user.path)}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-muted-foreground">
                                            <span className="inline-flex items-center gap-1.5">
                                                {timeAgo(user.last_seen_at) ===
                                                    'agora' && (
                                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                                )}
                                                {timeAgo(user.last_seen_at)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {user.tenant && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        impersonate(user)
                                                    }
                                                >
                                                    <LogIn className="h-3.5 w-3.5" />
                                                    Acessar como
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </DevAdminLayout>
    );
}
