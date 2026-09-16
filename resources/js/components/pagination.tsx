import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginationProps {
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
}

export function Pagination({ links, from, to, total }: PaginationProps) {
    if (total <= 0) return null;

    // Filter out prev/next from numbered links
    const numbered = links.slice(1, -1);
    const prev = links[0];
    const next = links[links.length - 1];

    return (
        <div className="flex flex-col items-center justify-between gap-4 px-1 py-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
                Mostrando{' '}
                <span className="font-semibold text-foreground">{from}</span> a{' '}
                <span className="font-semibold text-foreground">{to}</span> de{' '}
                <span className="font-semibold text-foreground">{total}</span>{' '}
                resultados
            </p>

            <div className="flex items-center gap-1">
                {prev.url ? (
                    <Link
                        href={prev.url}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                    >
                        <ChevronLeft className="size-4" />
                    </Link>
                ) : (
                    <span className="rounded-lg p-2 text-muted-foreground/30">
                        <ChevronLeft className="size-4" />
                    </span>
                )}

                {numbered.map((link, i) => (
                    <span key={i}>
                        {link.url ? (
                            <Link
                                href={link.url}
                                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                    link.active
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ) : (
                            <span
                                className="px-3 py-1.5 text-sm text-muted-foreground/50"
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        )}
                    </span>
                ))}

                {next.url ? (
                    <Link
                        href={next.url}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                    >
                        <ChevronRight className="size-4" />
                    </Link>
                ) : (
                    <span className="rounded-lg p-2 text-muted-foreground/30">
                        <ChevronRight className="size-4" />
                    </span>
                )}
            </div>
        </div>
    );
}
