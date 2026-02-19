<?php

namespace App\Services;

use App\Models\CustomSubtask;
use App\Models\Event;
use App\Models\EventInstanceStatus;
use App\Models\Subtask;
use App\Models\SubtaskInstance;
use Illuminate\Support\Facades\Log;

class EventInstanceStatusService
{
    public static function updateForEvent(Event $event): ?EventInstanceStatus
    {
        // Overrides tienen series_id pero son eventos reales; guardamos por event_id
        if ($event->series_id) {
            return self::updateForInstanceEvent($event);
        }

        // Evento único (no recurrente)
        $total = Subtask::where('event_id', $event->id)->whereNull('deleted_at')->count();
        $completed = Subtask::where('event_id', $event->id)->whereNull('deleted_at')->where('completed', true)->count();
        $status = self::resolveStatus($total, $completed);

        return EventInstanceStatus::updateOrCreate(
            ['event_id' => $event->id],
            [
                'series_id' => null,
                'instance_date' => null,
                'subtasks_total' => $total,
                'subtasks_completed' => $completed,
                'status' => $status,
            ]
        );
    }

    public static function updateForInstanceId(string $eventInstanceId): ?EventInstanceStatus
    {
        if (strpos($eventInstanceId, '_') !== false) {
            [$seriesId, $instanceDate] = explode('_', $eventInstanceId, 2);
            if (!$seriesId || !$instanceDate) {
                return null;
            }
            return self::updateForSeriesDate((int) $seriesId, $instanceDate);
        }

        $event = Event::find($eventInstanceId);
        if (!$event) {
            return null;
        }
        return self::updateForEvent($event);
    }

    public static function updateForSeriesDate(int $seriesId, string $instanceDate): ?EventInstanceStatus
    {
        $masterEvent = Event::find($seriesId);
        if (!$masterEvent) {
            return null;
        }

        $instanceId = $seriesId . '_' . $instanceDate;
        [$total, $completed] = self::calculateInstanceCounts($masterEvent->id, $instanceId);
        $status = self::resolveStatus($total, $completed);

        return EventInstanceStatus::updateOrCreate(
            ['series_id' => $seriesId, 'instance_date' => $instanceDate],
            [
                'event_id' => null,
                'subtasks_total' => $total,
                'subtasks_completed' => $completed,
                'status' => $status,
            ]
        );
    }

    private static function updateForInstanceEvent(Event $event): ?EventInstanceStatus
    {
        $masterId = $event->series_id ?: $event->id;
        [$total, $completed] = self::calculateInstanceCounts($masterId, (string) $event->id);
        $status = self::resolveStatus($total, $completed);

        return EventInstanceStatus::updateOrCreate(
            ['event_id' => $event->id],
            [
                'series_id' => $event->series_id,
                'instance_date' => null,
                'subtasks_total' => $total,
                'subtasks_completed' => $completed,
                'status' => $status,
            ]
        );
    }

    private static function calculateInstanceCounts(int $masterEventId, string $instanceId): array
    {
        $masterSubtasks = Subtask::where('event_id', $masterEventId)
            ->whereNull('deleted_at')
            ->get(['id']);
        $masterIds = $masterSubtasks->pluck('id')->all();

        if (empty($masterIds)) {
            $customTotal = CustomSubtask::where('event_instance_id', $instanceId)->count();
            $customCompleted = CustomSubtask::where('event_instance_id', $instanceId)->where('completed', true)->count();
            return [$customTotal, $customCompleted];
        }

        $hiddenIds = SubtaskInstance::where('event_instance_id', $instanceId)
            ->where('overridden', true)
            ->whereIn('subtask_id', $masterIds)
            ->pluck('subtask_id')
            ->all();

        $visibleMasterIds = array_values(array_diff($masterIds, $hiddenIds));

        $totalMaster = count($visibleMasterIds);
        $completedMaster = 0;
        if ($totalMaster > 0) {
            $completedMaster = SubtaskInstance::where('event_instance_id', $instanceId)
                ->where('completed', true)
                ->where('overridden', false)
                ->whereIn('subtask_id', $visibleMasterIds)
                ->count();
        }

        $customTotal = CustomSubtask::where('event_instance_id', $instanceId)->count();
        $customCompleted = CustomSubtask::where('event_instance_id', $instanceId)->where('completed', true)->count();

        return [$totalMaster + $customTotal, $completedMaster + $customCompleted];
    }

    private static function resolveStatus(int $total, int $completed): string
    {
        if ($total <= 0) {
            return 'none';
        }
        if ($completed >= $total) {
            return 'done';
        }
        return 'partial';
    }
}
