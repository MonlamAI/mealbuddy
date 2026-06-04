<?php

namespace App\Filament\Resources\WeeklyMenus\Schemas;

use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\FileUpload;
use Filament\Schemas\Schema;

class WeeklyMenuForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('weekday')
                    ->options([
                        'mon' => 'Monday',
                        'tue' => 'Tuesday',
                        'wed' => 'Wednesday',
                        'thu' => 'Thursday',
                        'fri' => 'Friday',
                    ])
                    ->required()
                    ->unique(ignoreRecord: true),
                TextInput::make('title')
                    ->required(),
                FileUpload::make('image_url')
                    ->disk(config('filesystems.bills_disk', 'bills'))
                    ->directory('weekly-menus')
                    ->image()
                    ->imageEditor()
                    ->maxSize(5120),
            ]);
    }
}
