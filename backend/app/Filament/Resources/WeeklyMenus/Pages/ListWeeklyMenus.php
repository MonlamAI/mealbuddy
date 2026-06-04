<?php

namespace App\Filament\Resources\WeeklyMenus\Pages;

use App\Filament\Resources\WeeklyMenus\WeeklyMenuResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListWeeklyMenus extends ListRecords
{
    protected static string $resource = WeeklyMenuResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
