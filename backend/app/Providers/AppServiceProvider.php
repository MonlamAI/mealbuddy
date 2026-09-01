<?php

namespace App\Providers;

use App\Models\MonthlyBill;
use App\Models\UserMonthlyBill;
use App\Policies\MonthlyBillPolicy;
use App\Policies\UserMonthlyBillPolicy;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Illuminate\Auth\Notifications\ResetPassword;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
         if (app()->environment('production')) {
             URL::forceScheme('https');
         }

         $this->configureDefaults();
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(MonthlyBill::class, MonthlyBillPolicy::class);
        Gate::policy(UserMonthlyBill::class, UserMonthlyBillPolicy::class);

        ResetPassword::createUrlUsing(function ($notifiable, string $token) {
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
            return "{$frontendUrl}/reset-password?token={$token}&email={$notifiable->getEmailForPasswordReset()}";
        });

        $this->configureDefaults();
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
