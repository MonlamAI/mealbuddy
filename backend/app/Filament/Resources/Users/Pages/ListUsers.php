<?php

namespace App\Filament\Resources\Users\Pages;

use App\Filament\Resources\Users\UserResource;
use Filament\Actions\Action;
use Filament\Actions\CreateAction;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ListRecords;
use Illuminate\Support\Facades\Artisan;

class ListUsers extends ListRecords
{
    protected static string $resource = UserResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('syncLeaves')
                ->label('Sync Leaves')
                ->icon('heroicon-o-arrow-path')
                ->color('success')
                ->action(function () {
                    Artisan::call('lunch:sync-leaves');
                    $output = Artisan::output();

                    Notification::make()
                        ->title('Leave Sync Completed')
                        ->body(trim($output) ?: 'Leaves synced successfully.')
                        ->success()
                        ->send();
                }),
            CreateAction::make(),
        ];
    }
}
