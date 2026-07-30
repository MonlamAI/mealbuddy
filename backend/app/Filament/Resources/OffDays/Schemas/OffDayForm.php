<?php

namespace App\Filament\Resources\OffDays\Schemas;

use Filament\Schemas\Schema;

class OffDayForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                \Filament\Forms\Components\DatePicker::make('off_date')
                    ->required()
                    ->unique(ignoreRecord: true),
                \Filament\Forms\Components\TextInput::make('reason')
                    ->required()
                    ->maxLength(255),
            ]);
    }
}
