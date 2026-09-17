<?php

namespace Database\Factories;

use App\Models\Tenant;
use App\Models\TenantPayment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TenantPayment>
 */
class TenantPaymentFactory extends Factory
{
    protected $model = TenantPayment::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $methods = ['pix', 'boleto', 'cartao', 'transferencia'];

        return [
            'tenant_id' => Tenant::factory(),
            'amount' => fake()->randomFloat(2, 49, 599),
            'method' => fake()->randomElement($methods),
            'reference_period' => now()->subMonths(fake()->numberBetween(0, 6))->format('Y-m'),
            'description' => 'Plano ' . fake()->randomElement(['Básico', 'Intermediário', 'Avançado']),
            'paid_at' => fake()->dateTimeBetween('-6 months', 'now'),
            'notes' => fake()->optional(0.3)->sentence(),
            'receipt_url' => null,
            'recorded_by' => null,
        ];
    }
}
