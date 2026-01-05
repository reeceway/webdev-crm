import api from './api';
import type { Note, NoteType } from '../types';

interface NotesResponse {
  notes: Note[];
  total: number;
  limit: number;
  offset: number;
}

interface NoteParams {
  client_id?: number;
  company_id?: number;
  project_id?: number;
  lead_id?: number;
  note_type?: NoteType;
  search?: string;
  limit?: number;
  offset?: number;
}

export const notesService = {
  async getAll(params?: NoteParams): Promise<NotesResponse> {
    const response = await api.get<NotesResponse>('/notes', { params });
    return response.data;
  },

  async getById(id: number): Promise<Note> {
    const response = await api.get<Note>(`/notes/${id}`);
    return response.data;
  },

  async create(data: Partial<Note>): Promise<Note> {
    const response = await api.post<{ note: Note }>('/notes', data);
    return response.data.note;
  },

  async update(id: number, data: Partial<Note>): Promise<Note> {
    const response = await api.put<{ note: Note }>(`/notes/${id}`, data);
    return response.data.note;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/notes/${id}`);
  },
};
