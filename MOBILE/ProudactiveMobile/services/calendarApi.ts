import { API_BASE } from '../src/config/api';
import authService from './auth';

// Helper para obtener headers autenticados
async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await authService.getToken();
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

async function apiPutEventTimes(eventId: string, startUtcIso: string, endUtcIso: string) {
  const url = `${API_BASE}/events/${eventId}`;
  const headers = await getAuthHeaders();
  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ start_utc: startUtcIso, end_utc: endUtcIso }),
  });
  return res;
}

async function apiPutEvent(eventId: string, payload: any) {
  const url = `${API_BASE}/events/${eventId}`;
  const headers = await getAuthHeaders();
  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
  return res;
}

async function apiGetCalendars() {
  const url = `${API_BASE}/calendars`;
  const headers = await getAuthHeaders();
  
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers
    });

    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch(err) {
    console.error('📅 Error loading calendars:', err);
    return null;
  }
}

async function apiPostEvent(payload: any) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return res;
}

async function apiDeleteEvent(eventId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/events/${eventId}`, { 
    method: 'DELETE',
    headers 
  });
  return res;
}

async function apiFetchEvents(startIso: string, endIso: string) {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ start: startIso, end: endIso });
  const res = await fetch(`${API_BASE}/events?${params.toString()}`, {
    headers
  });
  return res;
}

// Funciones de API para subtareas
async function apiGetSubtasks(eventId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/events/${eventId}/subtasks`, { headers });
  return res;
}

async function apiCreateSubtask(eventId: string, text: string, sortOrder: number = 0) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/subtasks`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      event_id: eventId,
      text: text,
      sort_order: sortOrder
    }),
  });
  return res;
}

async function apiUpdateSubtask(subtaskId: string, updates: {text?: string, completed?: boolean, sort_order?: number}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/subtasks/${subtaskId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates),
  });
  return res;
}

async function apiDeleteSubtask(subtaskId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/subtasks/${subtaskId}`, { 
    method: 'DELETE',
    headers 
  });
  return res;
}

async function apiUpdateMultipleSubtasks(subtasks: Array<{id: string, text?: string, completed?: boolean, sort_order?: number}>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/subtasks/update-multiple`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ subtasks }),
  });
  return res;
}

export {
  apiPutEventTimes,
  apiPutEvent,
  apiGetCalendars,
  apiPostEvent,
  apiDeleteEvent,
  apiFetchEvents,
  apiGetSubtasks,
  apiCreateSubtask,
  apiUpdateSubtask,
  apiDeleteSubtask,
  apiUpdateMultipleSubtasks
};
