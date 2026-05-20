<?php

namespace App\Filament\Resources\LunchDays;

use App\Filament\Resources\LunchDays\Pages\CreateLunchDay;
use App\Filament\Resources\LunchDays\Pages\EditLunchDay;
use App\Filament\Resources\LunchDays\Pages\ListLunchDays;
use App\Filament\Resources\LunchDays\Schemas\LunchDayForm;
use App\Filament\Resources\LunchDays\Tables\LunchDaysTable;
use App\Models\LunchDay;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;
use Filament\Tables\Columns\TextColumn;

class LunchDayResource extends Resource
{
    protected static ?string $model = LunchDay::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedRectangleStack;

    protected static ?string $recordTitleAttribute = 'LunchDay';

    public static function form(Schema $schema): Schema
    {
        return LunchDayForm::configure($schema);
    }


    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('lunch_date')
                    ->date()
                    ->sortable(),
    
                TextColumn::make('menu.title')
                    ->label('Meal'),
    
                TextColumn::make('orders_count')
                    ->counts('orders')
                    ->label('Total Votes'),
    
                TextColumn::make('opted_in_orders_count')
                    ->counts('optedInOrders')
                    ->label('Eating Count')
                    ->badge()
                    ->color('success'),
            ])
            ->defaultSort('lunch_date', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => ListLunchDays::route('/'),
            'create' => CreateLunchDay::route('/create'),
            'edit' => EditLunchDay::route('/{record}/edit'),
        ];
    }
}
