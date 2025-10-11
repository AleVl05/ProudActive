<?php

namespace App\Http\Controllers;

use App\Models\Recipe;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class RecipeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $recipes = Recipe::where('user_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($recipes);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'nullable|string',
            'ingredients' => 'nullable|array',
        ]);

        $recipe = Recipe::create([
            'user_id' => Auth::id(),
            'title' => $request->title,
            'content' => $request->content,
            'ingredients' => $request->ingredients,
            'is_favorite' => false,
            'visibility' => 'private',
        ]);

        return response()->json($recipe, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Recipe $recipe): JsonResponse
    {
        // Verificar que la receta pertenece al usuario autenticado
        if ($recipe->user_id !== Auth::id()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        return response()->json($recipe);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Recipe $recipe): JsonResponse
    {
        // Verificar que la receta pertenece al usuario autenticado
        if ($recipe->user_id !== Auth::id()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $request->validate([
            'title' => 'sometimes|string|max:255',
            'content' => 'nullable|string',
            'ingredients' => 'nullable|array',
            'is_favorite' => 'sometimes|boolean',
        ]);

        $recipe->update($request->only(['title', 'content', 'ingredients', 'is_favorite']));

        return response()->json($recipe);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Recipe $recipe): JsonResponse
    {
        // Verificar que la receta pertenece al usuario autenticado
        if ($recipe->user_id !== Auth::id()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $recipe->delete();

        return response()->json(['message' => 'Receta eliminada correctamente']);
    }

    /**
     * Test endpoint without authentication
     */
    public function test(): JsonResponse
    {
        try {
            $recipes = Recipe::all();
            return response()->json([
                'success' => true,
                'message' => 'Database connection working',
                'recipes_count' => $recipes->count(),
                'recipes' => $recipes
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
            $title = $request->input('title', 'Receta de prueba');
            $content = $request->input('content', 'Contenido de la receta');
            
            $recipe = Recipe::create([
                'user_id' => 1,
                'title' => $title,
                'content' => $content,
                'ingredients' => null,
                'is_favorite' => false,
                'visibility' => 'private',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Recipe created successfully',
                'recipe' => $recipe
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
            $recipe = Recipe::find($id);
            if (!$recipe) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recipe not found'
                ], 404);
            }

            $recipe->delete();

            return response()->json([
                'success' => true,
                'message' => 'Recipe deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ], 500);
        }
    }
}
