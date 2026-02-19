<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Subtask;
use App\Models\Event;
use App\Services\EventInstanceStatusService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class SubtaskController extends Controller
{
    /**
     * Obtener todas las subtareas de un evento
     */
    public function index(Request $request, $eventId): JsonResponse
    {
        try {
            \Log::info('📋 SubtaskController::index - START', [
                'event_id' => $eventId,
                'user_id' => $request->user()->id
            ]);
            
            // Debug: verificar si el evento existe
            $event = Event::find($eventId);
            if (!$event) {
                \Log::warning('⚠️  SubtaskController::index - Event not found', ['event_id' => $eventId]);
                return response()->json(['error' => 'Event not found'], 404);
            }
            
            \Log::info('📋 SubtaskController::index - Event found', [
                'event_id' => $event->id,
                'title' => $event->title,
                'is_recurring' => $event->is_recurring,
                'series_id' => $event->series_id
            ]);
            
            // Debug: verificar acceso
            if ($event->user_id !== $request->user()->id) {
                \Log::warning('⚠️  SubtaskController::index - Unauthorized access', [
                    'event_user_id' => $event->user_id,
                    'request_user_id' => $request->user()->id
                ]);
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            // Obtener subtareas usando el modelo Eloquent (solo las no eliminadas)
            $subtasks = $event->subtasks()->get();

            \Log::info('✅ SubtaskController::index - Subtasks loaded', [
                'count' => $subtasks->count(),
                'subtasks' => $subtasks->map(function($st) {
                    return [
                        'id' => $st->id,
                        'text' => $st->text,
                        'completed' => $st->completed,
                        'sort_order' => $st->sort_order
                    ];
                })->toArray()
            ]);

            return response()->json([
                'success' => true,
                'data' => $subtasks
            ]);
        } catch (\Exception $e) {
            \Log::error('❌ SubtaskController::index - ERROR', [
                'event_id' => $eventId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener subtareas: ' . $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    }

    /**
     * Crear una nueva subtarea
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'event_id' => 'required|exists:events,id',
                'text' => 'required|string|max:500',
                'sort_order' => 'integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $event = Event::findOrFail($request->event_id);
            
            // Verificar que el usuario tenga acceso al evento
            if ($event->user_id !== $request->user()->id) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            // Idempotencia: evitar duplicados por reintento/doble submit
            $existingSubtask = Subtask::where('event_id', $request->event_id)
                ->where('text', $request->text)
                ->where('sort_order', $request->get('sort_order', 0))
                ->whereNull('deleted_at')
                ->first();

            if ($existingSubtask) {
                $requestId = $request->header('X-Request-Id') ?? $request->header('X-Request-ID');
                \Log::warning('⚠️  SubtaskController::store - Duplicate prevented', [
                    'event_id' => $request->event_id,
                    'text' => $request->text,
                    'sort_order' => $request->get('sort_order', 0),
                    'subtask_id' => $existingSubtask->id,
                    'request_id' => $requestId
                ]);

                return response()->json([
                    'success' => true,
                    'data' => $existingSubtask
                ], 200);
            }

            $subtask = Subtask::create([
                'event_id' => $request->event_id,
                'text' => $request->text,
                'completed' => $request->boolean('completed', false),
                'sort_order' => $request->get('sort_order', 0)
            ]);

            EventInstanceStatusService::updateForEvent($event);

            return response()->json([
                'success' => true,
                'data' => $subtask
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al crear subtarea: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar una subtarea
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'text' => 'sometimes|string|max:500',
                'completed' => 'sometimes|boolean',
                'sort_order' => 'sometimes|integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $subtask = Subtask::findOrFail($id);
            
            // Verificar que el usuario tenga acceso al evento
            if ($subtask->event->user_id !== $request->user()->id) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            $subtask->update($request->only(['text', 'completed', 'sort_order']));
            EventInstanceStatusService::updateForEvent($subtask->event);

            return response()->json([
                'success' => true,
                'data' => $subtask->fresh()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al actualizar subtarea: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar una subtarea
     */
    public function destroy($id, Request $request): JsonResponse
    {
        try {
            $subtask = Subtask::findOrFail($id);
            
            // Verificar que el usuario tenga acceso al evento
            if ($subtask->event->user_id !== $request->user()->id) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            $subtask->delete();
            EventInstanceStatusService::updateForEvent($subtask->event);

            return response()->json([
                'success' => true,
                'message' => 'Subtarea eliminada correctamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al eliminar subtarea: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar múltiples subtareas (para reordenar o marcar varias)
     */
    public function updateMultiple(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'subtasks' => 'required|array',
                'subtasks.*.id' => 'required|exists:subtasks,id',
                'subtasks.*.text' => 'sometimes|string|max:500',
                'subtasks.*.completed' => 'sometimes|boolean',
                'subtasks.*.sort_order' => 'sometimes|integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $updatedSubtasks = [];

            $eventIds = [];
            foreach ($request->subtasks as $subtaskData) {
                $subtask = Subtask::findOrFail($subtaskData['id']);
                
                // Verificar que el usuario tenga acceso al evento
                if ($subtask->event->user_id !== $request->user()->id) {
                    return response()->json(['error' => 'Unauthorized'], 403);
                }

                $subtask->update(array_filter($subtaskData, function($key) {
                    return in_array($key, ['text', 'completed', 'sort_order']);
                }, ARRAY_FILTER_USE_KEY));

                $updatedSubtasks[] = $subtask->fresh();
                $eventIds[$subtask->event_id] = true;
            }

            foreach (array_keys($eventIds) as $eventId) {
                $event = Event::find($eventId);
                if ($event) {
                    EventInstanceStatusService::updateForEvent($event);
                }
            }

            return response()->json([
                'success' => true,
                'data' => $updatedSubtasks
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al actualizar subtareas: ' . $e->getMessage()
            ], 500);
        }
    }
}
