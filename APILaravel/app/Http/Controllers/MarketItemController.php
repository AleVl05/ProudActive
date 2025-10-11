<?php

namespace App\Http\Controllers;

use App\Models\MarketItem;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class MarketItemController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $items = MarketItem::where('user_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($items);
    }

    /**
     * Test endpoint without authentication
     */
    public function test(): JsonResponse
    {
        try {
            // Test database connection
            $items = MarketItem::all();
            return response()->json([
                'success' => true,
                'message' => 'Database connection working',
                'items_count' => $items->count(),
                'items' => $items
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test insert endpoint without authentication
     */
    public function testInsert(Request $request): JsonResponse
    {
        try {
            $name = $request->input('name', 'Item sin nombre');
            
            // Create a test item
            $item = MarketItem::create([
                'user_id' => 1, // Assuming user ID 1 exists
                'name' => $name,
                'checked' => false,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Item created successfully',
                'item' => $item
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test toggle endpoint without authentication
     */
    public function testToggle(Request $request, $id): JsonResponse
    {
        try {
            $item = MarketItem::find($id);
            if (!$item) {
                return response()->json([
                    'success' => false,
                    'message' => 'Item not found'
                ], 404);
            }

            $item->checked = !$item->checked;
            $item->save();

            return response()->json([
                'success' => true,
                'message' => 'Item toggled successfully',
                'item' => $item
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test delete endpoint without authentication
     */
    public function testDelete($id): JsonResponse
    {
        try {
            $item = MarketItem::find($id);
            if (!$item) {
                return response()->json([
                    'success' => false,
                    'message' => 'Item not found'
                ], 404);
            }

            $item->delete();

            return response()->json([
                'success' => true,
                'message' => 'Item deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test delete all endpoint without authentication
     */
    public function testDeleteAll(): JsonResponse
    {
        try {
            $deletedCount = MarketItem::where('user_id', 1)->delete();

            return response()->json([
                'success' => true,
                'message' => 'All items deleted successfully',
                'deleted_count' => $deletedCount
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $item = MarketItem::create([
            'user_id' => Auth::id(),
            'name' => $request->name,
            'checked' => false,
        ]);

        return response()->json($item, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(MarketItem $marketItem): JsonResponse
    {
        // Verificar que el ítem pertenece al usuario autenticado
        if ($marketItem->user_id !== Auth::id()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        return response()->json($marketItem);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, MarketItem $marketItem): JsonResponse
    {
        // Verificar que el ítem pertenece al usuario autenticado
        if ($marketItem->user_id !== Auth::id()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'checked' => 'sometimes|boolean',
        ]);

        $marketItem->update($request->only(['name', 'checked']));

        return response()->json($marketItem);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(MarketItem $marketItem): JsonResponse
    {
        // Verificar que el ítem pertenece al usuario autenticado
        if ($marketItem->user_id !== Auth::id()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $marketItem->delete();

        return response()->json(['message' => 'Ítem eliminado correctamente']);
    }

    /**
     * Eliminar todos los ítems del usuario
     */
    public function destroyAll(): JsonResponse
    {
        MarketItem::where('user_id', Auth::id())->delete();

        return response()->json(['message' => 'Todos los ítems han sido eliminados']);
    }

    /**
     * Toggle el estado checked de un ítem
     */
    public function toggle(MarketItem $marketItem): JsonResponse
    {
        // Verificar que el ítem pertenece al usuario autenticado
        if ($marketItem->user_id !== Auth::id()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $marketItem->update(['checked' => !$marketItem->checked]);

        return response()->json($marketItem);
    }
}
