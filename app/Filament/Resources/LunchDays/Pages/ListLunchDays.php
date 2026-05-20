<?php

namespace App\Filament\Resources\LunchDays\Pages;

use App\Filament\Resources\LunchDays\LunchDayResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListLunchDays extends ListRecords
{
    protected static string $resource = LunchDayResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
