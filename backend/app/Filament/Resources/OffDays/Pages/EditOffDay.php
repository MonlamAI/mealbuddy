<?php

namespace App\Filament\Resources\OffDays\Pages;

use App\Filament\Resources\OffDays\OffDayResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditOffDay extends EditRecord
{
    protected static string $resource = OffDayResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
