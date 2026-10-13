/**
 * Input masks for Brazilian documents, phones and postcodes. They format
 * progressively while typing and accept already-formatted values.
 */
function digitsOf(value: string, max: number): string {
    return value.replace(/\D/g, '').slice(0, max);
}

/** 000.000.000-00 */
export function maskCPF(value: string): string {
    return digitsOf(value, 11)
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

/** 00.000.000/0000-00 */
export function maskCNPJ(value: string): string {
    return digitsOf(value, 14)
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
}

/** CPF while it fits in 11 digits, CNPJ beyond that. */
export function maskDocument(value: string): string {
    return value.replace(/\D/g, '').length > 11
        ? maskCNPJ(value)
        : maskCPF(value);
}

/** (11) 3333-4444 or (11) 98600-8482 */
export function maskPhone(value: string): string {
    const digits = digitsOf(value, 11);

    if (digits.length <= 2) {
        return digits ? `(${digits}` : '';
    }

    const area = digits.slice(0, 2);
    const number = digits.slice(2);
    const split = digits.length === 11 ? 5 : 4;

    return number.length <= split
        ? `(${area}) ${number}`
        : `(${area}) ${number.slice(0, split)}-${number.slice(split)}`;
}

/** 00000-000 */
export function maskCEP(value: string): string {
    return digitsOf(value, 8).replace(/^(\d{5})(\d)/, '$1-$2');
}
