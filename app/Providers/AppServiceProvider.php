<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureQueryMacros();
    }

    /**
     * Case-insensitive LIKE that works the same on every driver.
     *
     * Postgres has native ILIKE; sqlite (used in dev/tests) and MySQL do not,
     * so a LOWER()-wrapped LIKE is used there instead. Without this, code
     * written against ILIKE only works in production and breaks locally.
     */
    protected function configureQueryMacros(): void
    {
        $whereLike = function (QueryBuilder|Builder $query, string $column, string $value, string $boolean = 'and'): QueryBuilder|Builder {
            if ($query->getConnection()->getDriverName() === 'pgsql') {
                return $query->where($column, 'ilike', $value, $boolean);
            }

            return $query->whereRaw('LOWER('.$column.') LIKE LOWER(?)', [$value], $boolean);
        };

        Builder::macro('whereLike', function (string $column, string $value) use ($whereLike) {
            /** @var Builder $this */
            return $whereLike($this, $column, $value);
        });

        Builder::macro('orWhereLike', function (string $column, string $value) use ($whereLike) {
            /** @var Builder $this */
            return $whereLike($this, $column, $value, 'or');
        });

        QueryBuilder::macro('whereLike', function (string $column, string $value) use ($whereLike) {
            /** @var QueryBuilder $this */
            return $whereLike($this, $column, $value);
        });

        QueryBuilder::macro('orWhereLike', function (string $column, string $value) use ($whereLike) {
            /** @var QueryBuilder $this */
            return $whereLike($this, $column, $value, 'or');
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
