<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Eloquent\Model;

/**
 * Like "exists", but only for records of the signed-in user's clinic. A plain
 * exists:table,id check accepts ids from any clinic, which let one clinic
 * book another clinic's professional or attach another clinic's patient.
 */
class BelongsToClinic implements ValidationRule
{
    /**
     * @param  class-string<Model>  $model
     */
    public function __construct(private string $model) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $tenantId = auth()->user()?->tenant_id;

        $exists = $tenantId !== null && is_scalar($value) && $this->model::query()
            ->whereKey($value)
            ->where((new $this->model)->qualifyColumn('tenant_id'), $tenantId)
            ->exists();

        if (! $exists) {
            $fail('validation.exists')->translate();
        }
    }
}
