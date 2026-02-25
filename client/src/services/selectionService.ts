import api from './api';
import type { Selection } from '../types';

export interface SelectionWithUser extends Omit<Selection, 'user'> {
  user: {
    id: number;
    email: string;
    displayName: string;
  };
}

export interface Conflict {
  userId: number;
  userName: string;
  dayId: number;
  acts: {
    actId: number;
    actName: string;
    stageId: number;
    stageName: string;
    startTime: string;
    endTime: string;
  }[];
}

export const selectionService = {
  async getGroupSelections(groupId: number): Promise<SelectionWithUser[]> {
    const response = await api.get<{ success: boolean; data: SelectionWithUser[] }>(
      `/groups/${groupId}/selections`
    );
    return response.data.data;
  },

  async getMySelections(groupId: number): Promise<Selection[]> {
    const response = await api.get<{ success: boolean; data: Selection[] }>(
      `/groups/${groupId}/selections/me`
    );
    return response.data.data;
  },

  async addSelection(groupId: number, actId: number, priority: number = 1): Promise<Selection> {
    const response = await api.post<{ success: boolean; data: Selection }>(
      `/groups/${groupId}/selections`,
      { actId, priority }
    );
    return response.data.data;
  },

  async removeSelection(groupId: number, actId: number): Promise<void> {
    await api.delete(`/groups/${groupId}/selections/${actId}`);
  },

  async getConflicts(groupId: number, eventId: number): Promise<Conflict[]> {
    const response = await api.get<{ success: boolean; data: Conflict[] }>(
      `/groups/${groupId}/events/${eventId}/conflicts`
    );
    return response.data.data;
  },
};
