<?php

namespace App\Filament\Resources\OffDays\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Table;

class OffDaysTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                \Filament\Tables\Columns\TextColumn::make('off_date')
                    ->date()
                    ->sortable()
                    ->searchable(),
                \Filament\Tables\Columns\TextColumn::make('reason')
                    ->searchable(),
            ])
            ->defaultSort('off_date', 'asc')
            ->filters([
                //
            ])
            ->recordActions([
                EditAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }
}
