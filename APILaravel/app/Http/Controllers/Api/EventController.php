<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Calendar;
use App\Models\EventCategory;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class EventController extends Controller
{
    /**
     * Listar eventos con filtros de fecha
     */
    public function index(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'start' => 'required|date',
            'end' => 'required|date|after:start',
            'calendar_id' => 'nullable|exists:calendars,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de entrada inválidos',
                'errors' => $validator->errors()
            ], 422);
        }

        $query = Event::with(['calendar', 'category', 'alarms', 'recurrenceExceptions'])
            ->where('user_id', $request->user()->id)
            ->whereBetween('start_utc', [$request->start, $request->end])
            ->whereNull('deleted_at');

        if ($request->calendar_id) {
            $query->where('calendar_id', $request->calendar_id);
        }

        $events = $query->orderBy('start_utc')->get();

        return response()->json([
            'success' => true,
            'data' => $events
        ]);
    }

    /**
     * Crear nuevo evento
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'calendar_id' => 'required|exists:calendars,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'start_utc' => 'required|date',
            'end_utc' => 'required|date|after:start_utc',
            'all_day' => 'boolean',
            'timezone' => 'nullable|string',
            'color' => 'nullable|string|max:7',
            'category_id' => 'nullable|exists:event_categories,id',
            'is_recurring' => 'boolean',
            'recurrence_rule' => 'nullable|string',
            'recurrence_end_date' => 'nullable|date|after_or_equal:start_utc',
            'series_id' => 'nullable|exists:events,id',
            'original_start_utc' => 'nullable|date',
            'alarms' => 'nullable|array',
            'alarms.*.trigger_minutes_before' => 'required_with:alarms|integer|min:1',
            'alarms.*.method' => 'required_with:alarms|in:local,push,email',
            'alarms.*.custom_message' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de entrada inválidos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Log para debugging de overrides
            if ($request->series_id && $request->original_start_utc) {
                Log::info('🎯 Creating override for series', [
                    'series_id' => $request->series_id,
                    'original_start_utc' => $request->original_start_utc,
                    'new_start_utc' => $request->start_utc,
                    'new_end_utc' => $request->end_utc,
                    'title' => $request->title
                ]);
            }

            // Verificar si es un override y si la serie original tiene subtareas
            $shouldIgnoreColor = false;
            if ($request->series_id) {
                $seriesEvent = Event::find($request->series_id);
                if ($seriesEvent && $seriesEvent->subtasks()->count() > 0) {
                    $shouldIgnoreColor = true;
                }
            }

            $event = Event::create([
                'uuid' => Str::uuid(),
                'calendar_id' => $request->calendar_id,
                'user_id' => $request->user()->id,
                'category_id' => $request->category_id,
                'title' => $request->title,
                'description' => $request->description,
                'location' => $request->location,
                'start_utc' => $request->start_utc,
                'end_utc' => $request->end_utc,
                'all_day' => $request->all_day ?? false,
                'timezone' => $request->timezone ?? 'UTC',
                'color' => $shouldIgnoreColor ? null : $request->color,
                'is_recurring' => $request->is_recurring ?? false,
                'recurrence_rule' => $request->recurrence_rule,
                'recurrence_end_date' => $request->recurrence_end_date,
                'series_id' => $request->series_id,
                'original_start_utc' => $request->original_start_utc,
                'version' => 1,
            ]);

            // Crear alarmas si se proporcionan
            if ($request->alarms) {
                foreach ($request->alarms as $alarmData) {
                    $event->alarms()->create([
                        'trigger_minutes_before' => $alarmData['trigger_minutes_before'],
                        'method' => $alarmData['method'],
                        'custom_message' => $alarmData['custom_message'] ?? null,
                    ]);
                }
            }

            DB::commit();

            // Log de confirmación para overrides
            if ($request->series_id && $request->original_start_utc) {
                Log::info('✅ Override created successfully', [
                    'override_id' => $event->id,
                    'series_id' => $event->series_id,
                    'original_start_utc' => $event->original_start_utc,
                    'new_start_utc' => $event->start_utc
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Evento creado exitosamente',
                'data' => $event->load(['calendar', 'category', 'alarms'])
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al crear el evento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mostrar evento específico
     */
    public function show(string $id, Request $request): JsonResponse
    {
        $event = Event::with(['calendar', 'category', 'alarms', 'recurrenceExceptions'])
            ->where('user_id', $request->user()->id)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$event) {
            return response()->json([
                'success' => false,
                'message' => 'Evento no encontrado'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $event
        ]);
    }

    /**
     * Actualizar evento
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $event = Event::where('user_id', $request->user()->id)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$event) {
            return response()->json([
                'success' => false,
                'message' => 'Evento no encontrado'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'calendar_id' => 'sometimes|exists:calendars,id',
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'start_utc' => 'sometimes|date',
            'end_utc' => 'sometimes|date|after:start_utc',
            'all_day' => 'boolean',
            'timezone' => 'nullable|string',
            'color' => 'nullable|string|max:7',
            'category_id' => 'nullable|exists:event_categories,id',
            'is_recurring' => 'boolean',
            'recurrence_rule' => 'nullable|string',
            'recurrence_end_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de entrada inválidos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Verificar si el evento tiene subtareas
            $hasSubtasks = $event->subtasks()->count() > 0;
            
            // Preparar datos para actualizar
            $updateData = $request->only([
                'calendar_id', 'title', 'description', 'location',
                'start_utc', 'end_utc', 'all_day', 'timezone', 'category_id',
                'is_recurring', 'recurrence_rule', 'recurrence_end_date'
            ]);
            
            // Si el evento tiene subtareas, ignorar el color (se maneja automáticamente por el frontend)
            if (!$hasSubtasks && $request->has('color')) {
                $updateData['color'] = $request->color;
            }
            
            $event->update(array_merge(
                $updateData,
                ['version' => $event->version + 1]
            ));

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Evento actualizado exitosamente',
                'data' => $event->fresh(['calendar', 'category', 'alarms'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar el evento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar evento
     */
    public function destroy(string $id, Request $request): JsonResponse
    {
        $event = Event::where('user_id', $request->user()->id)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$event) {
            return response()->json([
                'success' => false,
                'message' => 'Evento no encontrado'
            ], 404);
        }

        try {
            // Si es un override (tiene series_id y original_start_utc), 
            // crear una excepción de recurrencia para marcar que esa instancia fue eliminada
            if ($event->series_id && $event->original_start_utc) {
                // Crear excepción de recurrencia para marcar que esta instancia fue eliminada
                DB::table('recurrence_exceptions')->insert([
                    'event_id' => $event->series_id,  // ID de la serie original
                    'exception_date' => \Carbon\Carbon::parse($event->original_start_utc)->toDateString(),
                    'is_deleted' => true,
                    'reason' => 'Override deleted',
                    'created_at' => now()
                ]);
            }
            
            $event->delete(); // Soft delete

            return response()->json([
                'success' => true,
                'message' => 'Evento eliminado exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar el evento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Listar calendarios del usuario
     */
    public function calendars(Request $request): JsonResponse
    {
        Log::info('calendars.called', [
            'user_id' => $request->user()->id,
            'headers' => request()->headers->all(),
            'method' => request()->method(),
            'fullUrl' => request()->fullUrl(),
            'ip' => request()->ip(),
        ]);

        $calendars = Calendar::where('user_id', $request->user()->id)
            ->whereNull('deleted_at')
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $calendars
        ]);
    }

    /**
     * Listar categorías del usuario
     */
    public function categories(Request $request): JsonResponse
    {
        $categories = EventCategory::where('user_id', $request->user()->id)
            ->orderBy('is_default', 'desc')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $categories
        ]);
    }

    /**
     * Eliminar TODOS los eventos del usuario (ACCIÓN ULTRA SENSIBLE)
     * Requiere validación de contraseña
     */
    public function deleteAllEvents(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'La contraseña es requerida',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = $request->user();

        // Validar contraseña
        if (!Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Contraseña incorrecta'
            ], 401);
        }

        try {
            DB::beginTransaction();

            // Obtener IDs de eventos antes de eliminar
            $eventIds = Event::where('user_id', $user->id)
                ->whereNull('deleted_at')
                ->pluck('id')
                ->toArray();

            $eventsCount = count($eventIds);

            // Eliminar todas las excepciones de recurrencia relacionadas primero
            if (!empty($eventIds)) {
                DB::table('recurrence_exceptions')
                    ->whereIn('event_id', $eventIds)
                    ->delete();
            }

            // Eliminar todos los eventos del usuario (soft delete)
            Event::where('user_id', $user->id)
                ->whereNull('deleted_at')
                ->delete();

            DB::commit();

            Log::warning('⚠️ TODOS LOS EVENTOS ELIMINADOS', [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'events_deleted' => $eventsCount,
                'timestamp' => now()->toDateTimeString()
            ]);

            return response()->json([
                'success' => true,
                'message' => "Se eliminaron {$eventsCount} evento(s) de tu cuenta",
                'data' => [
                    'events_deleted' => $eventsCount
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error eliminando todos los eventos', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar los eventos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Restaurar eventos eliminados del usuario (últimos 7 días)
     * Restaura eventos que fueron eliminados con soft delete en los últimos 7 días
     */
    public function restoreAllEvents(Request $request): JsonResponse
    {
        $user = $request->user();

        try {
            DB::beginTransaction();

            // Obtener eventos eliminados en los últimos 7 días (soft delete)
            $sevenDaysAgo = now()->subDays(7);
            $deletedEvents = Event::withTrashed()
                ->where('user_id', $user->id)
                ->whereNotNull('deleted_at')
                ->where('deleted_at', '>=', $sevenDaysAgo)
                ->get();

            $eventsCount = $deletedEvents->count();

            if ($eventsCount === 0) {
                return response()->json([
                    'success' => true,
                    'message' => 'No hay eventos eliminados en los últimos 7 días para restaurar',
                    'data' => [
                        'events_restored' => 0
                    ]
                ]);
            }

            // Restaurar todos los eventos
            foreach ($deletedEvents as $event) {
                $event->restore();
            }

            DB::commit();

            Log::info('✅ EVENTOS RESTAURADOS (ÚLTIMOS 7 DÍAS)', [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'events_restored' => $eventsCount,
                'timestamp' => now()->toDateTimeString()
            ]);

            return response()->json([
                'success' => true,
                'message' => "Se restauraron {$eventsCount} evento(s) eliminados en los últimos 7 días",
                'data' => [
                    'events_restored' => $eventsCount
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error restaurando eventos', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al restaurar los eventos',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}