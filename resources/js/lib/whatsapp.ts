/**
 * Brazilian phone numbers → WhatsApp click-to-chat links. Patient phones are
 * stored as typed (masked or not), so everything works on the digits alone.
 */
function normalizedDigits(phone: string | null | undefined): string | null {
    const digits = (phone ?? '').replace(/\D/g, '').replace(/^0+/, '');

    // Local number with area code: (11) 98600-8482 / (11) 3333-4444.
    if (digits.length === 10 || digits.length === 11) {
        return `55${digits}`;
    }

    // Already carries the country code.
    if (
        digits.startsWith('55') &&
        (digits.length === 12 || digits.length === 13)
    ) {
        return digits;
    }

    return null;
}

/** wa.me link for the number, optionally with a pre-filled message. */
export function whatsappUrl(
    phone: string | null | undefined,
    text?: string,
): string | null {
    const digits = normalizedDigits(phone);

    if (!digits) return null;

    return text
        ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
        : `https://wa.me/${digits}`;
}

/** "(11) 98600-8482", or the original text when it isn't a valid number. */
export function formatPhone(phone: string | null | undefined): string {
    const digits = normalizedDigits(phone);

    if (!digits) return phone ?? '';

    const local = digits.slice(2);
    const area = local.slice(0, 2);
    const number = local.slice(2);
    const split = number.length === 9 ? 5 : 4;

    return `(${area}) ${number.slice(0, split)}-${number.slice(split)}`;
}
