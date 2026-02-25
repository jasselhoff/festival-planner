import api from './api';
import type { Event, EventFull, EventCreateInput, Stage, Act, ActCreateInput, Day } from '../types';

export const eventService = {
  async listEvents(): Promise<Event[]> {
    const response = await api.get<{ success: boolean; data: Event[] }>('/events');
    return response.data.data;
  },

  async listMyEvents(): Promise<Event[]> {
    const response = await api.get<{ success: boolean; data: Event[] }>('/events/my');
    return response.data.data;
  },

  async getEvent(id: number): Promise<Event> {
    const response = await api.get<{ success: boolean; data: Event }>(`/events/${id}`);
    return response.data.data;
  },

  async getEventFull(id: number): Promise<EventFull> {
    const response = await api.get<{ success: boolean; data: EventFull }>(`/events/${id}/full`);
    return response.data.data;
  },

  async createEvent(data: EventCreateInput): Promise<Event> {
    const response = await api.post<{ success: boolean; data: Event }>('/events', data);
    return response.data.data;
  },

  async updateEvent(id: number, data: Partial<EventCreateInput>): Promise<Event> {
    const response = await api.put<{ success: boolean; data: Event }>(`/events/${id}`, data);
    return response.data.data;
  },

  async deleteEvent(id: number): Promise<void> {
    await api.delete(`/events/${id}`);
  },

  // Days
  async listDays(eventId: number): Promise<Day[]> {
    const response = await api.get<{ success: boolean; data: Day[] }>(`/events/${eventId}/days`);
    return response.data.data;
  },

  // Stages
  async listStages(eventId: number): Promise<Stage[]> {
    const response = await api.get<{ success: boolean; data: Stage[] }>(`/events/${eventId}/stages`);
    return response.data.data;
  },

  async createStage(eventId: number, data: { name: string; description?: string; sortOrder?: number }): Promise<Stage> {
    const response = await api.post<{ success: boolean; data: Stage }>(`/events/${eventId}/stages`, data);
    return response.data.data;
  },

  async updateStage(eventId: number, stageId: number, data: Partial<{ name: string; description?: string; sortOrder?: number }>): Promise<Stage> {
    const response = await api.put<{ success: boolean; data: Stage }>(`/events/${eventId}/stages/${stageId}`, data);
    return response.data.data;
  },

  async deleteStage(eventId: number, stageId: number): Promise<void> {
    await api.delete(`/events/${eventId}/stages/${stageId}`);
  },

  // Acts
  async listActs(eventId: number): Promise<Act[]> {
    const response = await api.get<{ success: boolean; data: Act[] }>(`/events/${eventId}/acts`);
    return response.data.data;
  },

  async createAct(eventId: number, data: ActCreateInput): Promise<Act> {
    const response = await api.post<{ success: boolean; data: Act }>(`/events/${eventId}/acts`, data);
    return response.data.data;
  },

  async updateAct(eventId: number, actId: number, data: Partial<ActCreateInput>): Promise<Act> {
    const response = await api.put<{ success: boolean; data: Act }>(`/events/${eventId}/acts/${actId}`, data);
    return response.data.data;
  },

  async deleteAct(eventId: number, actId: number): Promise<void> {
    await api.delete(`/events/${eventId}/acts/${actId}`);
  },
};
