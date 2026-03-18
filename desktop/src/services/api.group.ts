import api from './api.base';

// Group API
export const groupApi = {
  getList: () => api.get('/groups'),

  create: (name: string, memberIds?: string[]) =>
    api.post('/groups', { name, memberIds }),

  getDetail: (id: string) => api.get(`/groups/${id}`),

  get: (id: string) => api.get(`/groups/${id}`),

  update: (id: string, data: { name?: string; avatar?: string; announcement?: string }) =>
    api.put(`/groups/${id}`, data),

  delete: (id: string) => api.delete(`/groups/${id}`),

  inviteMembers: (id: string, memberIds: string[]) =>
    api.post(`/groups/${id}/members`, { memberIds }),

  removeMember: (groupId: string, memberId: string) =>
    api.delete(`/groups/${groupId}/members/${memberId}`),

  setMemberRole: (groupId: string, memberId: string, role: 'admin' | 'member') =>
    api.put(`/groups/${groupId}/members/${memberId}/role`, { role }),

  setRole: (groupId: string, memberId: string, role: 'admin' | 'member') =>
    api.put(`/groups/${groupId}/members/${memberId}/role`, { role }),

  quit: (id: string) => api.post(`/groups/${id}/quit`),
};
