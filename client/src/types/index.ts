// User types
export interface User {
  id: number;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface UserCreateInput {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Event types
export interface Event {
  id: number;
  uuid: string;
  name: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate: string;
  creatorId: number;
  createdAt: string;
}

export interface EventCreateInput {
  name: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate: string;
}

export interface Day {
  id: number;
  eventId: number;
  date: string;
  name?: string;
}

export interface Stage {
  id: number;
  eventId: number;
  name: string;
  description?: string;
  sortOrder: number;
}

// Artist type (normalized artist storage)
export interface Artist {
  id: number;
  name: string;
  spotifyArtistId?: string;
  genre?: string;
  imageUrl?: string;
  createdBy: number;
  createdAt: string;
}

export interface ArtistCreateInput {
  name: string;
  spotifyArtistId?: string;
  genre?: string;
  imageUrl?: string;
}

export interface Act {
  id: number;
  eventId: number;
  dayId: number;
  stageId: number;
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  genre?: string;
  spotifyArtistId?: string;
  artistId?: number;
  artist?: Artist;
}

export interface ActCreateInput {
  dayId: number;
  stageId: number;
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  genre?: string;
  artistId?: number;
}

// Full event with nested data
export interface EventFull extends Event {
  days: Day[];
  stages: Stage[];
  acts: Act[];
}

// Group types
export interface Group {
  id: number;
  uuid: string;
  name: string;
  description?: string;
  creatorId: number;
  createdAt: string;
}

export interface GroupCreateInput {
  name: string;
  description?: string;
}

export interface GroupMember {
  id: number;
  groupId: number;
  userId: number;
  role: 'admin' | 'member';
  joinedAt: string;
  user?: User;
}

export interface GroupEvent {
  id: number;
  groupId: number;
  eventId: number;
  addedAt: string;
  addedBy: number;
  event?: Event;
}

// Selection types
export interface Selection {
  id: number;
  userId: number;
  groupId: number;
  actId: number;
  priority: number;
  createdAt: string;
  user?: User;
}

export interface SelectionInput {
  actId: number;
  priority?: number;
}

// WebSocket message types
export type WebSocketMessage =
  | { type: 'SELECTION_ADDED'; payload: { userId: number; actId: number; groupId: number; userName: string; priority: number } }
  | { type: 'SELECTION_REMOVED'; payload: { userId: number; actId: number; groupId: number } }
  | { type: 'MEMBER_JOINED'; payload: { groupId: number; user: User } }
  | { type: 'MEMBER_LEFT'; payload: { groupId: number; userId: number } }
  | { type: 'JOIN_GROUP'; payload: { groupId: number } }
  | { type: 'LEAVE_GROUP'; payload: { groupId: number } }
  | { type: 'PING'; payload: Record<string, never> }
  | { type: 'PONG'; payload: Record<string, never> };

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Spotify types
export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  imageUrl?: string;
}

export interface SpotifyConnectionStatus {
  connected: boolean;
  spotifyUserId?: string;
  displayName?: string;
}

export interface CreatePlaylistOptions {
  groupId: number;
  eventId: number;
  playlistName: string;
  description?: string;
  memberIds?: number[];
  tracksPerArtist: number;
  isPublic: boolean;
}

export interface CreatePlaylistResult {
  playlistUrl: string;
  playlistId: string;
  trackCount: number;
  artistsIncluded: string[];
  artistsNotFound: string[];
}

export interface SavedPlaylist {
  id: number;
  groupId: number;
  eventId: number;
  createdBy: number;
  spotifyPlaylistId: string;
  spotifyPlaylistUrl: string;
  playlistName: string;
  description?: string;
  trackCount: number;
  artistsIncluded: string[];
  isPublic: boolean;
  createdAt: string;
  createdByUser?: { id: number; displayName: string };
}

export interface EventActsGroup {
  eventId: number;
  eventName: string;
  acts: Act[];
}
