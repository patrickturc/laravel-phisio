import { router } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png'];

interface Props {
    /** Image key in /settings/organization/images/{image}. */
    image: 'logo' | 'owner-photo';
    label: string;
    hint: string;
    url: string | null;
    icon: LucideIcon;
    rounded?: boolean;
}

/**
 * Uploads (or removes) a clinic image right away, separate from the profile
 * form, keeping whatever was typed in the form untouched.
 */
export function ImageUpload({
    image,
    label,
    hint,
    url,
    icon: Icon,
    rounded = false,
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const visitOptions = {
        preserveScroll: true,
        preserveState: true,
        onStart: () => setBusy(true),
        onFinish: () => setBusy(false),
    };

    function upload(file: File) {
        if (!ACCEPTED.includes(file.type)) {
            setError('Envie uma imagem JPG ou PNG.');

            return;
        }

        if (file.size > MAX_BYTES) {
            setError('A imagem deve ter no máximo 2 MB.');

            return;
        }

        setError(null);
        router.post(
            `/settings/organization/images/${image}`,
            { image: file },
            {
                ...visitOptions,
                forceFormData: true,
                onError: (errors) =>
                    setError(
                        errors.image ?? 'Não foi possível enviar a imagem.',
                    ),
            },
        );
    }

    function remove() {
        setError(null);
        router.delete(`/settings/organization/images/${image}`, visitOptions);
    }

    const shape = rounded ? 'rounded-full' : 'rounded-xl';

    return (
        <div className="flex items-start gap-4">
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className={`relative flex size-20 shrink-0 items-center justify-center overflow-hidden border-2 border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-primary hover:text-primary ${shape}`}
                title={
                    url
                        ? `Trocar ${label.toLowerCase()}`
                        : `Enviar ${label.toLowerCase()}`
                }
            >
                {url ? (
                    <img
                        src={url}
                        alt={label}
                        className="size-full object-cover"
                    />
                ) : (
                    <Icon className="size-6" />
                )}
                {busy && (
                    <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                        <Loader2 className="size-5 animate-spin" />
                    </span>
                )}
            </button>
            <div className="min-w-0 space-y-2">
                <div>
                    <p className="text-sm font-medium text-foreground">
                        {label}
                    </p>
                    <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => inputRef.current?.click()}
                    >
                        {url ? 'Trocar' : 'Enviar'}
                    </Button>
                    {url && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={remove}
                            className="text-muted-foreground hover:text-red-600"
                        >
                            Remover
                        </Button>
                    )}
                </div>
                <InputError message={error ?? undefined} />
            </div>
            <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) upload(file);
                    e.target.value = '';
                }}
            />
        </div>
    );
}
