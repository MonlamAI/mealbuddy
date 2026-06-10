<?php

namespace App\Policies;

use App\Models\MonthlyBill;
use App\Models\User;

class MonthlyBillPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->isAccountantOrAdmin($user);
    }

    public function view(User $user, MonthlyBill $monthlyBill): bool
    {
        return $this->isAccountantOrAdmin($user);
    }

    public function create(User $user): bool
    {
        return $this->isAccountantOrAdmin($user);
    }

    public function updatePayment(User $user): bool
    {
        return $this->isAccountantOrAdmin($user);
    }

    public function delete(User $user, MonthlyBill $monthlyBill): bool
    {
        return $this->isAccountantOrAdmin($user);
    }


    private function isAccountantOrAdmin(User $user): bool
    {
        return in_array($user->role, ['accountant', 'admin', 'super_admin'], true);
    }
}
