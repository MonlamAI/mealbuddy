<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Admin
        User::updateOrCreate(
            ['email' => 'admin@mealbuddy.com'],
            [
                'name' => 'Admin User',
                'password' => '123asdzxc',
                'role' => 'admin',
                'is_active' => true,
            ]
        );

        // 2. Chef
        User::updateOrCreate(
            ['email' => 'chef@mealbuddy.com'],
            [
                'name' => 'Chef Andre',
                'password' => '123asdzxc',
                'role' => 'chef',
                'is_active' => true,
            ]
        );

        // 3. Accountant
        User::updateOrCreate(
            ['email' => 'mealacc@yopmail.com'],
            [
                'name' => 'Accountant User',
                'password' => '123asdzxc',
                'role' => 'accountant',
                'is_active' => true,
            ]
        );

        // 4. Employee
        User::updateOrCreate(
            ['email' => 'employee@example.com'],
            [
                'name' => 'Employee User',
                'password' => '123asdzxc',
                'role' => 'employee',
                'is_active' => true,
            ]
        );
    }
}
