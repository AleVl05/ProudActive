<?php

namespace App\Http\Controllers;

use App\Models\Note;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class NoteController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $notes = Note::where('user_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($notes);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'nullable|string',
            'checklist' => 'nullable|array',
            'blocks' => 'nullable|array',
        ]);

        $note = Note::create([
            'user_id' => Auth::id(),
            'title' => $request->title,
            'content' => $request->content,
            'checklist' => $request->checklist,
            'blocks' => $request->blocks,
            'is_favorite' => false,
            'visibility' => 'private',
        ]);

        return response()->json($note, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Note $note): JsonResponse
    {
        // Verificar que la nota pertenece al usuario autenticado
        if ($note->user_id !== Auth::id()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        return response()->json($note);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Note $note): JsonResponse
    {
        // Verificar que la nota pertenece al usuario autenticado
        if ($note->user_id !== Auth::id()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $request->validate([
            'title' => 'sometimes|string|max:255',
            'content' => 'nullable|string',
            'checklist' => 'nullable|array',
            'blocks' => 'nullable|array',
            'is_favorite' => 'sometimes|boolean',
        ]);

        $data = $request->only(['title', 'content', 'checklist', 'blocks', 'is_favorite']);
        
        // Log para debug
        \Log::info('Updating note', [
            'note_id' => $note->id,
            'blocks' => $request->blocks,
            'blocks_count' => is_array($request->blocks) ? count($request->blocks) : 0,
        ]);
        
        $note->update($data);

        return response()->json($note);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Note $note): JsonResponse
    {
        // Verificar que la nota pertenece al usuario autenticado
        if ($note->user_id !== Auth::id()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $note->delete();

        return response()->json(['message' => 'Nota eliminada correctamente']);
    }
}

