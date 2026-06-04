<?php

namespace App\Filament\Resources\WeeklyMenus\Pages;

use App\Filament\Resources\WeeklyMenus\WeeklyMenuResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditWeeklyMenu extends EditRecord
{
    protected static string $resource = WeeklyMenuResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
