import { create } from 'zustand';
import type { Friendship, FriendRequest, Group, GroupMember } from '../types/index';

interface ContactState {
  // 状态
  friends: Friendship[];
  friendRequests: FriendRequest[];
  groups: Group[];
  currentGroupMembers: GroupMember[];
  loading: boolean;

  // 方法
  setFriends: (friends: Friendship[]) => void;
  addFriend: (friend: Friendship) => void;
  removeFriend: (id: string) => void;
  setFriendRequests: (requests: FriendRequest[]) => void;
  removeFriendRequest: (id: string) => void;
  setGroups: (groups: Group[]) => void;
  addGroup: (group: Group) => void;
  removeGroup: (id: string) => void;
  setCurrentGroupMembers: (members: GroupMember[]) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useContactStore = create<ContactState>((set) => ({
  friends: [],
  friendRequests: [],
  groups: [],
  currentGroupMembers: [],
  loading: false,

  setFriends: (friends) => set({ friends }),

  addFriend: (friend) =>
    set((state) => ({
      friends: [...state.friends, friend],
      friendRequests: state.friendRequests.filter((r) => r.id !== friend.id),
    })),

  removeFriend: (id) =>
    set((state) => ({
      friends: state.friends.filter((f) => f.id !== id),
    })),

  setFriendRequests: (friendRequests) => set({ friendRequests }),

  removeFriendRequest: (id) =>
    set((state) => ({
      friendRequests: state.friendRequests.filter((r) => r.id !== id),
    })),

  setGroups: (groups) => set({ groups }),

  addGroup: (group) =>
    set((state) => ({
      groups: [...state.groups, group],
    })),

  removeGroup: (id) =>
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== id),
    })),

  setCurrentGroupMembers: (currentGroupMembers) => set({ currentGroupMembers }),

  setLoading: (loading) => set({ loading }),

  reset: () =>
    set({
      friends: [],
      friendRequests: [],
      groups: [],
      currentGroupMembers: [],
      loading: false,
    }),
}));