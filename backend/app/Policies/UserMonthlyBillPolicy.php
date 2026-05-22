<?php

namespace App\Policies;

use App\Models\User;
use App\Models\UserMonthlyBill;

class UserMonthlyBillPolicy
{
    public function viewOwn(User $user): bool
    {
        return true;
    }

    public function view(User $user, UserMonthlyBill $userMonthlyBill): bool
    {
        return $userMonthlyBill->user_id === $user->id
            || in_array($user->role, ['accountant', 'admin', 'super_admin'], true);
    }

    public function updatePayment(User $user): bool
    {
        return in_array($user->role, ['accountant', 'admin', 'super_admin'], true);
    }
}
