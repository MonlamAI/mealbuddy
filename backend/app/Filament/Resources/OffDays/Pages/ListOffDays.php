<?php

namespace App\Filament\Resources\OffDays\Pages;

use App\Filament\Resources\OffDays\OffDayResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListOffDays extends ListRecords
{
    protected static string $resource = OffDayResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
