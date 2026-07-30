<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class OffDaySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $holidays = [
            ['off_date' => '2026-06-29', 'reason' => 'Zamling Chisang'],
            ['off_date' => '2026-07-06', 'reason' => 'Birth Day of HH Dalai Lama'],
            ['off_date' => '2026-09-02', 'reason' => 'Democracy Day'],
            ['off_date' => '2026-10-02', 'reason' => 'Gandhi Jayanti'],
            ['off_date' => '2026-12-10', 'reason' => 'Nobel Peace Prize Day'],
            ['off_date' => '2027-01-26', 'reason' => 'Republic Day'],
            ['off_date' => '2027-01-01', 'reason' => 'New Year'],
            ['off_date' => '2027-02-07', 'reason' => 'Losar'],
            ['off_date' => '2027-02-08', 'reason' => 'Losar'],
            ['off_date' => '2027-02-09', 'reason' => 'Losar'],
            ['off_date' => '2027-03-10', 'reason' => 'Tibetan Uprising Day'],
            ['off_date' => '2027-03-03', 'reason' => 'Choega Chopa'],
        ];

        foreach ($holidays as $holiday) {
            \App\Models\OffDay::updateOrCreate(
                ['off_date' => $holiday['off_date']],
                ['reason' => $holiday['reason']]
            );
        }
    }
}
