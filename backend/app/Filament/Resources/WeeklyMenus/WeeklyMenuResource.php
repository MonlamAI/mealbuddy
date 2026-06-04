<?php

namespace App\Filament\Resources\WeeklyMenus;

use App\Filament\Resources\WeeklyMenus\Pages\CreateWeeklyMenu;
use App\Filament\Resources\WeeklyMenus\Pages\EditWeeklyMenu;
use App\Filament\Resources\WeeklyMenus\Pages\ListWeeklyMenus;
use App\Filament\Resources\WeeklyMenus\Schemas\WeeklyMenuForm;
use App\Filament\Resources\WeeklyMenus\Tables\WeeklyMenusTable;
use App\Models\WeeklyMenu;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class WeeklyMenuResource extends Resource
{
    protected static ?string $model = WeeklyMenu::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedRectangleStack;

    protected static ?string $navigationLabel = 'Weekly Menus';

    protected static ?string $pluralModelLabel = 'Weekly Menus';

    protected static ?string $modelLabel = 'Weekly Menu';


    public static function form(Schema $schema): Schema
    {
        return WeeklyMenuForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return WeeklyMenusTable::configure($table);
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
            'index' => ListWeeklyMenus::route('/'),
            'create' => CreateWeeklyMenu::route('/create'),
            'edit' => EditWeeklyMenu::route('/{record}/edit'),
        ];
    }
}
