<?php

namespace App\Filament\Resources\OffDays;

use App\Filament\Resources\OffDays\Pages\CreateOffDay;
use App\Filament\Resources\OffDays\Pages\EditOffDay;
use App\Filament\Resources\OffDays\Pages\ListOffDays;
use App\Filament\Resources\OffDays\Schemas\OffDayForm;
use App\Filament\Resources\OffDays\Tables\OffDaysTable;
use App\Models\OffDay;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class OffDayResource extends Resource
{
    protected static ?string $model = OffDay::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedRectangleStack;

    public static function form(Schema $schema): Schema
    {
        return OffDayForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return OffDaysTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListOffDays::route('/'),
            'create' => CreateOffDay::route('/create'),
            'edit' => EditOffDay::route('/{record}/edit'),
        ];
    }
}
