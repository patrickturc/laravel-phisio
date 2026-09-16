import { Head, useForm, router } from '@inertiajs/react';
import {
    Megaphone,
    Plus,
    Trash2,
    Globe,
    Building,
    CheckCircle2,
    AlertTriangle,
    AlertOctagon,
    Info,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import DevAdminLayout from '@/layouts/DevAdminLayout';

interface Announcement {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'danger' | 'success';
    target_tenant_id: string | null;
    is_active: boolean;
    created_at: string;
    tenant?: {
        id: string;
        name: string;
    } | null;
}

interface TenantOption {
    id: string;
    name: string;
}

interface IndexProps {
    announcements: {
        data: Announcement[];
        links: any[];
    };
    tenants: TenantOption[];
}

export default function Index({ announcements, tenants }: IndexProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        message: '',
        type: 'info' as 'info' | 'warning' | 'danger' | 'success',
        target_tenant_id: '' as string,
        is_active: true,
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        post('/dev-admin/announcements', {
            onSuccess: () => {
                setIsCreateOpen(false);
                reset();
            },
        });
    };

    const handleToggleStatus = (announcement: Announcement) => {
        router.post(
            `/dev-admin/announcements/${announcement.id}/toggle-status`,
        );
    };

    const handleDelete = (announcement: Announcement) => {
        if (
            confirm(
                `Tem certeza que deseja excluir o comunicado "${announcement.title}"?`,
            )
        ) {
            router.delete(`/dev-admin/announcements/${announcement.id}`);
        }
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'warning':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        <AlertTriangle className="h-3 w-3" /> Manutenção / Aviso
                    </span>
                );
            case 'danger':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        <AlertOctagon className="h-3 w-3" /> Urgente
                    </span>
                );
            case 'success':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" /> Novidade / Sucesso
                    </span>
                );
            case 'info':
            default:
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        <Info className="h-3 w-3" /> Informativo
                    </span>
                );
        }
    };

    return (
        <DevAdminLayout>
            <Head title="Comunicados do Sistema" />

            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                        <Megaphone className="h-6 w-6 text-primary" />
                        Comunicados e Avisos Globais
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Publique avisos de manutenção, comunicados de novas
                        funcionalidades ou mensagens direcionadas a clínicas
                        específicas.
                    </p>
                </div>
                <Button
                    onClick={() => setIsCreateOpen(true)}
                    className="shrink-0 gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Novo Comunicado
                </Button>
            </div>

            <Card className="shadow-xs">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">
                        Mensagens Publicadas
                    </CardTitle>
                    <CardDescription>
                        Avisos visíveis no topo do painel das clínicas no
                        primeiro acesso.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-hidden rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    <TableHead>Título e Tipo</TableHead>
                                    <TableHead>Mensagem</TableHead>
                                    <TableHead>Destinatário</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">
                                        Ações
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {announcements.data.length > 0 ? (
                                    announcements.data.map((announcement) => (
                                        <TableRow key={announcement.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-semibold text-foreground">
                                                        {announcement.title}
                                                    </span>
                                                    <div>
                                                        {getTypeBadge(
                                                            announcement.type,
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-md">
                                                <p className="line-clamp-2 text-sm text-muted-foreground">
                                                    {announcement.message}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                {announcement.tenant ? (
                                                    <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs font-medium text-foreground">
                                                        <Building className="h-3 w-3 text-primary" />
                                                        {
                                                            announcement.tenant
                                                                .name
                                                        }
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                                        <Globe className="h-3 w-3" />
                                                        Todas as Clínicas
                                                        (Global)
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <button
                                                    onClick={() =>
                                                        handleToggleStatus(
                                                            announcement,
                                                        )
                                                    }
                                                    className={`cursor-pointer rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${announcement.is_active ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'}`}
                                                >
                                                    {announcement.is_active
                                                        ? 'Ativo'
                                                        : 'Pausado'}
                                                </button>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleDelete(
                                                            announcement,
                                                        )
                                                    }
                                                    className="h-8 px-2 text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
                                            className="py-8 text-center text-sm text-muted-foreground"
                                        >
                                            Nenhum comunicado cadastrado no
                                            momento.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Modal de Criação de Comunicado */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Publicar Novo Comunicado</DialogTitle>
                        <DialogDescription>
                            Configure a mensagem que será exibida para os
                            usuários no topo do sistema.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreate} className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label htmlFor="title">Título do Aviso</Label>
                            <Input
                                id="title"
                                value={data.title}
                                onChange={(e) =>
                                    setData('title', e.target.value)
                                }
                                placeholder="Ex: Manutenção Programada às 23h"
                                required
                            />
                            {errors.title && (
                                <p className="text-sm text-destructive">
                                    {errors.title}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="type">Tipo / Gravidade</Label>
                                <Select
                                    value={data.type}
                                    onValueChange={(val: any) =>
                                        setData('type', val)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="info">
                                            Informativo
                                        </SelectItem>
                                        <SelectItem value="warning">
                                            Aviso / Manutenção
                                        </SelectItem>
                                        <SelectItem value="danger">
                                            Urgente / Importante
                                        </SelectItem>
                                        <SelectItem value="success">
                                            Novidade / Sucesso
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="target_tenant">
                                    Destinatário
                                </Label>
                                <Select
                                    value={data.target_tenant_id || 'all'}
                                    onValueChange={(val) =>
                                        setData(
                                            'target_tenant_id',
                                            val === 'all' ? '' : val,
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todas as Clínicas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            Todas as Clínicas (Global)
                                        </SelectItem>
                                        {tenants.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>
                                                {t.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="message">Texto da Mensagem</Label>
                            <textarea
                                id="message"
                                rows={3}
                                value={data.message}
                                onChange={(e) =>
                                    setData('message', e.target.value)
                                }
                                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                placeholder="Descreva brevemente o aviso ou orientação para os clientes..."
                                required
                            />
                            {errors.message && (
                                <p className="text-sm text-destructive">
                                    {errors.message}
                                </p>
                            )}
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processing}>
                                Publicar Aviso
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </DevAdminLayout>
    );
}
