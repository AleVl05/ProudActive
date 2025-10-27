<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubtaskInstance;
use App\Models\Subtask;
use App\Models\Event;
use App\Models\CustomSubtask;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class SubtaskInstanceController extends Controller
{
    /**
     * Obtener todas las subtareas de un evento con su estado para una instancia específica
     * Combina: subtareas del maestro + estado de la instancia + subtareas custom
     */
    public function getSubtasksForInstance(Request $request, $eventInstanceId): JsonResponse
    {
        try {
            \Log::info('🔍 SubtaskInstanceController::getSubtasksForInstance - START', [
                'event_instance_id' => $eventInstanceId,
                'user_id' => $request->user()->id
            ]);
            
            $eventInstance = Event::findOrFail($eventInstanceId);
            
            \Log::info('🔍 SubtaskInstanceController::getSubtasksForInstance - Event instance found', [
                'id' => $eventInstance->id,
                'title' => $eventInstance->title,
                'series_id' => $eventInstance->series_id,
                'is_recurring' => $eventInstance->is_recurring
            ]);
            
            // Verificar que el usuario tenga acceso
            if ($eventInstance->user_id !== $request->user()->id) {
                \Log::warning('⚠️  SubtaskInstanceController::getSubtasksForInstance - Unauthorized', [
                    'event_user_id' => $eventInstance->user_id,
                    'request_user_id' => $request->user()->id
                ]);
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            // Obtener el evento maestro (si es una instancia de serie)
            $masterEvent = $eventInstance->series_id 
                ? Event::find($eventInstance->series_id) 
                : $eventInstance;

            // CRÍTICO: Si el master fue eliminado pero el override sigue existiendo
            if (!$masterEvent) {
                \Log::warning('⚠️  SubtaskInstanceController::getSubtasksForInstance - Master event deleted, returning empty subtasks', [
                    'event_instance_id' => $eventInstanceId,
                    'series_id' => $eventInstance->series_id
                ]);
                
                // Devolver subtasks vacías en lugar de error
                return response()->json([
                    'success' => true,
                    'data' => [
                        'event_instance_id' => $eventInstanceId,
                        'master_event_id' => null,
                        'is_recurring_instance' => $eventInstance->series_id !== null,
                        'subtasks' => []
                    ]
                ]);
            }

            \Log::info('🔍 SubtaskInstanceController::getSubtasksForInstance - Master event determined', [
                'master_event_id' => $masterEvent->id,
                'is_same_as_instance' => $masterEvent->id === $eventInstance->id
            ]);

            // Obtener subtareas del maestro con su estado para esta instancia
            $masterSubtasks = Subtask::where('event_id', $masterEvent->id)
                ->ordered()
                ->get()
                ->map(function ($subtask) use ($eventInstanceId) {
                    $instance = $subtask->getInstanceState($eventInstanceId);
                    
                    return [
                        'id' => $subtask->id,
                        'type' => 'master',
                        'text' => $subtask->text,
                        'sort_order' => $subtask->sort_order,
                        'completed' => $instance ? $instance->completed : false,
                        'completed_at' => $instance ? $instance->completed_at : null,
                        'overridden' => $instance ? $instance->overridden : false,
                        'notes' => $instance ? $instance->notes : null,
                        'instance_id' => $instance ? $instance->id : null,
                    ];
                })
                ->filter(function ($subtask) {
                    // Filtrar subtareas que están ocultas para esta instancia específica (overridden=true)
                    return !$subtask['overridden'];
                });

            \Log::info('🔍 SubtaskInstanceController::getSubtasksForInstance - Master subtasks loaded', [
                'count' => $masterSubtasks->count()
            ]);

            // Obtener subtareas custom de esta instancia
            $customSubtasks = $eventInstance->customSubtasks()
                ->ordered()
                ->get()
                ->map(function ($customSubtask) {
                    return [
                        'id' => $customSubtask->id,
                        'type' => 'custom',
                        'text' => $customSubtask->text,
                        'description' => $customSubtask->description,
                        'sort_order' => $customSubtask->sort_order,
                        'completed' => $customSubtask->completed,
                        'completed_at' => $customSubtask->completed_at,
                    ];
                });

            \Log::info('🔍 SubtaskInstanceController::getSubtasksForInstance - Custom subtasks loaded', [
                'count' => $customSubtasks->count()
            ]);

            // Combinar ambas listas
            $allSubtasks = $masterSubtasks->concat($customSubtasks)->sortBy('sort_order')->values();

            \Log::info('✅ SubtaskInstanceController::getSubtasksForInstance - SUCCESS', [
                'total_subtasks' => $allSubtasks->count(),
                'master_count' => $masterSubtasks->count(),
                'custom_count' => $customSubtasks->count()
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'event_instance_id' => $eventInstanceId,
                    'master_event_id' => $masterEvent->id,
                    'is_recurring_instance' => $eventInstance->series_id !== null,
                    'subtasks' => $allSubtasks
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('❌ SubtaskInstanceController::getSubtasksForInstance - ERROR', [
                'event_instance_id' => $eventInstanceId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener subtareas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Marcar/desmarcar una subtarea para una instancia específica (UPSERT)
     */
    public function toggleSubtaskInstance(Request $request): JsonResponse
    {
        try {
            \Log::info('🔄 SubtaskInstanceController::toggleSubtaskInstance - START', [
                'subtask_id' => $request->subtask_id,
                'event_instance_id' => $request->event_instance_id,
                'completed' => $request->completed,
                'user_id' => $request->user()->id
            ]);
            
            $validator = Validator::make($request->all(), [
                'subtask_id' => 'required|exists:subtasks,id',
                'event_instance_id' => 'required|exists:events,id',
                'completed' => 'required|boolean',
                'notes' => 'nullable|string'
            ]);

            if ($validator->fails()) {
                \Log::warning('⚠️  SubtaskInstanceController::toggleSubtaskInstance - Validation failed', [
                    'errors' => $validator->errors()->toArray()
                ]);
                
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            // Verificar acceso del usuario
            $eventInstance = Event::findOrFail($request->event_instance_id);
            if ($eventInstance->user_id !== $request->user()->id) {
                \Log::warning('⚠️  SubtaskInstanceController::toggleSubtaskInstance - Unauthorized', [
                    'event_user_id' => $eventInstance->user_id,
                    'request_user_id' => $request->user()->id
                ]);
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            \Log::info('🔄 SubtaskInstanceController::toggleSubtaskInstance - Performing UPSERT');

            // UPSERT: crear o actualizar la instancia
            $subtaskInstance = SubtaskInstance::updateOrCreate(
                [
                    'subtask_id' => $request->subtask_id,
                    'event_instance_id' => $request->event_instance_id
                ],
                [
                    'completed' => $request->completed,
                    'completed_at' => $request->completed ? now() : null,
                    'notes' => $request->notes
                ]
            );

            \Log::info('✅ SubtaskInstanceController::toggleSubtaskInstance - SUCCESS', [
                'subtask_instance_id' => $subtaskInstance->id,
                'completed' => $subtaskInstance->completed,
                'was_existing' => $subtaskInstance->wasRecentlyCreated ? 'no' : 'yes'
            ]);

            return response()->json([
                'success' => true,
                'data' => $subtaskInstance
            ]);
        } catch (\Exception $e) {
            \Log::error('❌ SubtaskInstanceController::toggleSubtaskInstance - ERROR', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Error al actualizar estado de subtarea: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Marcar múltiples subtareas para una instancia (batch update)
     */
    public function toggleMultipleSubtaskInstances(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'event_instance_id' => 'required|exists:events,id',
                'subtasks' => 'required|array',
                'subtasks.*.subtask_id' => 'required|exists:subtasks,id',
                'subtasks.*.completed' => 'required|boolean',
                'subtasks.*.notes' => 'nullable|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            // Verificar acceso del usuario
            $eventInstance = Event::findOrFail($request->event_instance_id);
            if ($eventInstance->user_id !== $request->user()->id) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            $updatedInstances = [];

            DB::beginTransaction();
            try {
                foreach ($request->subtasks as $subtaskData) {
                    $subtaskInstance = SubtaskInstance::updateOrCreate(
                        [
                            'subtask_id' => $subtaskData['subtask_id'],
                            'event_instance_id' => $request->event_instance_id
                        ],
                        [
                            'completed' => $subtaskData['completed'],
                            'completed_at' => $subtaskData['completed'] ? now() : null,
                            'notes' => $subtaskData['notes'] ?? null
                        ]
                    );

                    $updatedInstances[] = $subtaskInstance;
                }

                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

            return response()->json([
                'success' => true,
                'data' => $updatedInstances
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al actualizar subtareas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Ocultar una subtarea master en una instancia específica
     * Crea un subtask_instance con overridden=true para que no se muestre
     */
    public function hideSubtaskForInstance(Request $request): JsonResponse
    {
        try {
            \Log::info('🔒 SubtaskInstanceController::hideSubtaskForInstance - START', [
                'request_data' => $request->all(),
                'user_id' => $request->user()->id
            ]);

            $validator = Validator::make($request->all(), [
                'subtask_id' => 'required|exists:subtasks,id',
                'event_instance_id' => 'required|string'
            ]);

            if ($validator->fails()) {
                \Log::warning('⚠️  SubtaskInstanceController::hideSubtaskForInstance - Validation failed', [
                    'errors' => $validator->errors()
                ]);
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            // Verificar que la subtarea pertenece al evento maestro correcto
            // Usar withTrashed() para permitir ocultar subtareas que ya fueron soft-deleted
            $subtask = Subtask::withTrashed()->findOrFail($request->subtask_id);
            $eventInstanceId = $request->event_instance_id;

            // Extraer series_id si es un ID virtual (e.g., "692_2025-10-30")
            if (strpos($eventInstanceId, '_') !== false) {
                $seriesId = explode('_', $eventInstanceId)[0];
                $eventInstance = Event::findOrFail($seriesId);
            } else {
                $eventInstance = Event::findOrFail($eventInstanceId);
            }

            // Verificar acceso del usuario
            if ($eventInstance->user_id !== $request->user()->id) {
                \Log::warning('⚠️  SubtaskInstanceController::hideSubtaskForInstance - Unauthorized', [
                    'event_user_id' => $eventInstance->user_id,
                    'request_user_id' => $request->user()->id
                ]);
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            // Verificar que la subtarea pertenece al evento maestro
            $masterEventId = $eventInstance->series_id ?: $eventInstance->id;
            if ($subtask->event_id != $masterEventId) {
                \Log::warning('⚠️  SubtaskInstanceController::hideSubtaskForInstance - Subtask does not belong to master event', [
                    'subtask_event_id' => $subtask->event_id,
                    'master_event_id' => $masterEventId
                ]);
                return response()->json(['error' => 'Subtask does not belong to this event'], 422);
            }

            \Log::info('🔒 SubtaskInstanceController::hideSubtaskForInstance - Creating override record');

            // Crear registro con overridden=true para ocultar la subtarea
            $subtaskInstance = SubtaskInstance::updateOrCreate(
                [
                    'subtask_id' => $request->subtask_id,
                    'event_instance_id' => $eventInstanceId
                ],
                [
                    'completed' => false,
                    'overridden' => true,
                    'completed_at' => null,
                    'notes' => null
                ]
            );

            \Log::info('✅ SubtaskInstanceController::hideSubtaskForInstance - SUCCESS', [
                'subtask_instance_id' => $subtaskInstance->id,
                'overridden' => $subtaskInstance->overridden
            ]);

            return response()->json([
                'success' => true,
                'data' => $subtaskInstance
            ]);
        } catch (\Exception $e) {
            \Log::error('❌ SubtaskInstanceController::hideSubtaskForInstance - ERROR', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Error al ocultar subtarea: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear una subtarea custom para una instancia específica
     */
    public function storeCustomSubtask(Request $request): JsonResponse
    {
        try {
            \Log::info('🔧 SubtaskInstanceController::storeCustomSubtask - START', [
                'event_instance_id' => $request->event_instance_id,
                'text' => $request->text,
                'user_id' => $request->user()->id
            ]);
            
            $validator = Validator::make($request->all(), [
                'event_instance_id' => 'required|string', // Cambiar a string para soportar instancias virtuales
                'text' => 'required|string|max:500',
                'description' => 'nullable|string',
                'sort_order' => 'integer|min:0'
            ]);

            if ($validator->fails()) {
                \Log::error('❌ Validation failed', ['errors' => $validator->errors()]);
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $eventInstanceId = $request->event_instance_id;
            
            // Si es una instancia virtual (formato "681_2025-10-22"), extraer el series_id
            if (strpos($eventInstanceId, '_') !== false) {
                $seriesId = explode('_', $eventInstanceId)[0];
                \Log::info('🔍 Virtual instance detected', [
                    'event_instance_id' => $eventInstanceId,
                    'extracted_series_id' => $seriesId
                ]);
                $eventInstance = Event::findOrFail($seriesId);
            } else {
                \Log::info('🔍 Direct event ID', ['event_instance_id' => $eventInstanceId]);
                $eventInstance = Event::findOrFail($eventInstanceId);
            }
            
            // Verificar acceso
            if ($eventInstance->user_id !== $request->user()->id) {
                \Log::warning('⚠️  Unauthorized access attempt');
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            // Crear custom subtask con el event_instance_id original (puede ser virtual)
            $customSubtask = CustomSubtask::create([
                'event_instance_id' => $eventInstanceId, // Mantener el ID original (puede ser virtual)
                'text' => $request->text,
                'description' => $request->description,
                'sort_order' => $request->get('sort_order', 0),
                'completed' => false
            ]);

            \Log::info('✅ SubtaskInstanceController::storeCustomSubtask - SUCCESS', [
                'custom_subtask_id' => $customSubtask->id,
                'event_instance_id' => $eventInstanceId
            ]);

            return response()->json([
                'success' => true,
                'data' => $customSubtask
            ], 201);
        } catch (\Exception $e) {
            \Log::error('❌ SubtaskInstanceController::storeCustomSubtask - ERROR', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Error al crear subtarea personalizada: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar una subtarea custom
     */
    public function updateCustomSubtask(Request $request, $id): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'text' => 'sometimes|string|max:500',
                'description' => 'nullable|string',
                'completed' => 'sometimes|boolean',
                'sort_order' => 'sometimes|integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $customSubtask = \App\Models\CustomSubtask::findOrFail($id);
            
            // Verificar acceso
            if ($customSubtask->eventInstance->user_id !== $request->user()->id) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            $updateData = $request->only(['text', 'description', 'sort_order', 'completed']);
            
            if (isset($updateData['completed'])) {
                $updateData['completed_at'] = $updateData['completed'] ? now() : null;
            }

            $customSubtask->update($updateData);

            return response()->json([
                'success' => true,
                'data' => $customSubtask->fresh()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al actualizar subtarea personalizada: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar una subtarea custom
     */
    public function destroyCustomSubtask($id, Request $request): JsonResponse
    {
        try {
            $customSubtask = \App\Models\CustomSubtask::findOrFail($id);
            
            // Verificar acceso
            if ($customSubtask->eventInstance->user_id !== $request->user()->id) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            $customSubtask->delete();

            return response()->json([
                'success' => true,
                'message' => 'Subtarea personalizada eliminada correctamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al eliminar subtarea: ' . $e->getMessage()
            ], 500);
        }
    }
}

