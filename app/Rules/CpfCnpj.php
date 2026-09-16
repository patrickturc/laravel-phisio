<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Validates a Brazilian CPF (11 digits) or CNPJ (14 digits) by its check
 * digits, so a well-formed but invented number is rejected.
 */
class CpfCnpj implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $digits = preg_replace('/\D/', '', (string) $value) ?? '';

        $valid = match (strlen($digits)) {
            11 => $this->isValidCpf($digits),
            14 => $this->isValidCnpj($digits),
            default => false,
        };

        if (! $valid) {
            $fail('Informe um CPF ou CNPJ válido.');
        }
    }

    private function isValidCpf(string $cpf): bool
    {
        // Repeated digits pass the check-digit maths but are never issued.
        if (preg_match('/^(\d)\1{10}$/', $cpf)) {
            return false;
        }

        foreach ([9, 10] as $position) {
            $sum = 0;

            for ($i = 0; $i < $position; $i++) {
                $sum += (int) $cpf[$i] * (($position + 1) - $i);
            }

            $remainder = ($sum * 10) % 11;
            $digit = $remainder === 10 ? 0 : $remainder;

            if ($digit !== (int) $cpf[$position]) {
                return false;
            }
        }

        return true;
    }

    private function isValidCnpj(string $cnpj): bool
    {
        if (preg_match('/^(\d)\1{13}$/', $cnpj)) {
            return false;
        }

        $weightSets = [
            [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
            [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
        ];

        foreach ($weightSets as $index => $weights) {
            $sum = 0;

            foreach ($weights as $i => $weight) {
                $sum += (int) $cnpj[$i] * $weight;
            }

            $remainder = $sum % 11;
            $digit = $remainder < 2 ? 0 : 11 - $remainder;

            if ($digit !== (int) $cnpj[12 + $index]) {
                return false;
            }
        }

        return true;
    }
}
