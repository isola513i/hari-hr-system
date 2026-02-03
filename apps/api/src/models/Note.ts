export interface Note {
  id: string;
  user_id: string;
  content: string;
  color: NoteColor;
  pinned: boolean;
  created_at: Date;
  updated_at: Date;
}

export type NoteColor = 'default' | 'yellow' | 'green' | 'blue' | 'pink';

export interface CreateNoteRequest {
  content: string;
  color?: NoteColor;
  pinned?: boolean;
}

export interface UpdateNoteRequest {
  content?: string;
  color?: NoteColor;
  pinned?: boolean;
}

export interface NoteResponse {
  id: string;
  content: string;
  color: NoteColor;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}
