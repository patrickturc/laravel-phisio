import { AgendaSettingsForm } from '@/components/agenda-settings-form';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { Professional, ScheduleSettings } from '@/lib/agenda';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    settings: ScheduleSettings;
    professionals: Professional[];
    onSaved: () => void;
}

/**
 * "Configurar agenda" from the agenda page. The same settings live in the
 * "Agenda" tab of the clinic profile. Mounted with a fresh key per opening.
 */
export function AgendaSettingsDialog({
    open,
    onOpenChange,
    settings,
    professionals,
    onSaved,
}: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Configurar agenda</DialogTitle>
                    <DialogDescription>
                        Horários de funcionamento, limite de alunos, salas e
                        equipe.
                    </DialogDescription>
                </DialogHeader>

                <AgendaSettingsForm
                    settings={settings}
                    professionals={professionals}
                    onCancel={() => onOpenChange(false)}
                    onSaved={() => {
                        onOpenChange(false);
                        onSaved();
                    }}
                />
            </DialogContent>
        </Dialog>
    );
}
