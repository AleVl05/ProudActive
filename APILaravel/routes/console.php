<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use App\Models\Event;
use App\Models\CustomSubtask;
use App\Models\SubtaskInstance;
use App\Services\EventInstanceStatusService;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('event-status:backfill', function () {
    $this->info('Backfilling event instance statuses...');

    $events = Event::whereNull('deleted_at')->get();
    foreach ($events as $event) {
        if ($event->series_id) {
            EventInstanceStatusService::updateForEvent($event);
            continue;
        }
        if ($event->subtasks()->whereNull('deleted_at')->exists()) {
            EventInstanceStatusService::updateForEvent($event);
        }
    }

    $instanceIds = SubtaskInstance::select('event_instance_id')->distinct()->pluck('event_instance_id')->toArray();
    $customInstanceIds = CustomSubtask::select('event_instance_id')->distinct()->pluck('event_instance_id')->toArray();
    $allInstanceIds = array_unique(array_merge($instanceIds, $customInstanceIds));

    foreach ($allInstanceIds as $instanceId) {
        if (!$instanceId) {
            continue;
        }
        EventInstanceStatusService::updateForInstanceId((string) $instanceId);
    }

    $this->info('Backfill complete.');
})->purpose('Recalculate and store subtask status per event instance');
