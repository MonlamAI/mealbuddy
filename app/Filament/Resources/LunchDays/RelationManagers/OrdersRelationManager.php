<?php

namespace App\Filament\Resources\LunchDays\RelationManagers;

use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class OrdersRelationManager extends RelationManager
{
    protected static string $relationship = 'orders';

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('user.name')
                    ->label('Employee')
                    ->searchable(),

                TextColumn::make('status')
                    ->badge()
                    ->color(fn ($state) =>
                        $state === 'opted_in' ? 'success' : 'danger'
                    ),

                TextColumn::make('created_at')
                    ->label('Voted')
                    ->since(),
            ])
            ->defaultSort('created_at', 'desc');
    }
}