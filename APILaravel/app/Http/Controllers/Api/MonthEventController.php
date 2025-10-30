<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Models\MonthEvent;

class MonthEventController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'year' => 'required|integer|min:1970|max:2100',
            'month' => 'required|integer|min:1|max:12',
            'calendar_id' => 'nullable|exists:calendars,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $year = (int) $request->year;
        $month = (int) $request->month;
        $start = sprintf('%04d-%02d-01', $year, $month);
        $end = date('Y-m-t', strtotime($start));

        $query = MonthEvent::where('user_id', $request->user()->id)
            ->whereNull('deleted_at')
            ->where(function ($q) use ($start, $end) {
                // Overlap de rango de fechas
                $q->whereBetween('start_date', [$start, $end])
                  ->orWhereBetween('end_date', [$start, $end])
                  ->orWhere(function ($q2) use ($start, $end) {
                      $q2->where('start_date', '<=', $start)->where('end_date', '>=', $end);
                  });
            })
            ->orderBy('start_date');

        if ($request->calendar_id) {
            $query->where('calendar_id', $request->calendar_id);
        }

        $events = $query->get();
        return response()->json(['success' => true, 'data' => $events]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'calendar_id' => 'required|exists:calendars,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'color' => 'nullable|string|max:7',
            'text_color' => 'nullable|string|max:7',
            'border_color' => 'nullable|string|max:7',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $payload = $validator->validated();
        $payload['uuid'] = (string) Str::uuid();
        $payload['user_id'] = $request->user()->id;
        $payload['all_day'] = true;
        $payload['timezone'] = $request->user()->timezone ?? 'UTC';

        $event = MonthEvent::create($payload);
        return response()->json(['success' => true, 'data' => $event], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $event = MonthEvent::where('id', $id)->where('user_id', $request->user()->id)->firstOrFail();

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'start_date' => 'sometimes|required|date',
            'end_date' => 'sometimes|required|date|after_or_equal:start_date',
            'color' => 'nullable|string|max:7',
            'text_color' => 'nullable|string|max:7',
            'border_color' => 'nullable|string|max:7',
            'calendar_id' => 'sometimes|required|exists:calendars,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $event->update($validator->validated());
        return response()->json(['success' => true, 'data' => $event]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $event = MonthEvent::where('id', $id)->where('user_id', $request->user()->id)->firstOrFail();
        $event->delete();
        return response()->json(['success' => true]);
    }
}

