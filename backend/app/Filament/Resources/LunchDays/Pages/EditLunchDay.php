<?php

namespace App\Filament\Resources\LunchDays\Pages;

use App\Filament\Resources\LunchDays\LunchDayResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditLunchDay extends EditRecord
{
    protected static string $resource = LunchDayResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
