import api from './api.base';

// Friend API
export const friendApi = {
  getList: () => api.get('/friends'),

  sendRequest: (friendId: string, message?: string) =>
    api.post('/friends/request', { friendId, message }),

  getRequests: () => api.get('/friends/requests'),

  handleRequest: (id: string, action: 'accept' | 'reject') =>
    api.put(`/friends/request/${id}`, { action }),

  delete: (id: string) => api.delete(`/friends/${id}`),

  setRemark: (id: string, remark: string) =>
    api.put(`/friends/${id}/remark`, { remark }),

  // 好友分组
  getGroups: () => api.get('/friends/groups'),

  createGroup: (name: string) => api.post('/friends/groups', { name }),

  updateGroup: (id: string, name: string) => api.put(`/friends/groups/${id}`, { name }),

  deleteGroup: (id: string) => api.delete(`/friends/groups/${id}`),

  moveFriend: (friendshipId: string, groupId: string | null) =>
    api.put(`/friends/groups/${friendshipId}/move`, { groupId }),

  reorderGroups: (orders: { id: string; order: number }[]) =>
    api.put('/friends/groups/reorder', { orders }),
};
