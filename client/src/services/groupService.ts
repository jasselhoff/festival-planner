import api from './api';
import type { Group, GroupCreateInput, GroupMember, Event } from '../types';

export interface GroupEvent extends Event {
  addedAt: string;
  addedBy: number;
}

export const groupService = {
  async listGroups(): Promise<Group[]> {
    const response = await api.get<{ success: boolean; data: Group[] }>('/groups');
    return response.data.data;
  },

  async createGroup(data: GroupCreateInput): Promise<Group> {
    const response = await api.post<{ success: boolean; data: Group }>('/groups', data);
    return response.data.data;
  },

  async getGroup(id: number): Promise<Group> {
    const response = await api.get<{ success: boolean; data: Group }>(`/groups/${id}`);
    return response.data.data;
  },

  async getGroupByUuid(uuid: string): Promise<Group> {
    const response = await api.get<{ success: boolean; data: Group }>(`/groups/uuid/${uuid}`);
    return response.data.data;
  },

  async updateGroup(id: number, data: Partial<GroupCreateInput>): Promise<Group> {
    const response = await api.put<{ success: boolean; data: Group }>(`/groups/${id}`, data);
    return response.data.data;
  },

  async deleteGroup(id: number): Promise<void> {
    await api.delete(`/groups/${id}`);
  },

  async joinGroup(uuid: string): Promise<Group> {
    const response = await api.post<{ success: boolean; data: Group }>(`/groups/join/${uuid}`);
    return response.data.data;
  },

  async leaveGroup(id: number): Promise<void> {
    await api.delete(`/groups/${id}/leave`);
  },

  async listMembers(groupId: number): Promise<GroupMember[]> {
    const response = await api.get<{ success: boolean; data: GroupMember[] }>(`/groups/${groupId}/members`);
    return response.data.data;
  },

  async removeMember(groupId: number, memberId: number): Promise<void> {
    await api.delete(`/groups/${groupId}/members/${memberId}`);
  },

  // Group events
  async listGroupEvents(groupId: number): Promise<GroupEvent[]> {
    const response = await api.get<{ success: boolean; data: GroupEvent[] }>(`/groups/${groupId}/events`);
    return response.data.data;
  },

  async addEventToGroup(groupId: number, eventId: number): Promise<void> {
    await api.post(`/groups/${groupId}/events`, { eventId });
  },

  async removeEventFromGroup(groupId: number, eventId: number): Promise<void> {
    await api.delete(`/groups/${groupId}/events/${eventId}`);
  },
};
