import React, { useState, useEffect } from 'react';
import { Modal, Avatar, List, Button, Input, Select, message, Popconfirm, Tag } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  CrownOutlined,
  SafetyOutlined,
  UserDeleteOutlined,
  PlusOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { groupApi, friendApi } from '@services/api';
import type { Group } from '@types/index';
import './GroupInfo.css';

interface GroupInfoProps {
  visible: boolean;
  groupId: string | null;
  currentUserId: string;
  onClose: () => void;
  onQuit?: () => void;
}

interface GroupMember {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  nickname: string;
  user: {
    id: string;
    nickname: string;
    avatar: string | null;
    status: string;
  };
  joinedAt: string;
}

const GroupInfo: React.FC<GroupInfoProps> = ({
  visible,
  groupId,
  currentUserId,
  onClose,
  onQuit,
}) => {
  const [group, setGroup] = useState<Group & { members: GroupMember[]; isMember: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  useEffect(() => {
    if (visible && groupId) {
      loadGroupInfo();
    }
  }, [visible, groupId]);

  const loadGroupInfo = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const response: any = await groupApi.getDetail(groupId);
      if (response.code === 0) {
        setGroup(response.data);
      }
    } catch (error) {
      console.error('Failed to load group info:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFriends = async () => {
    try {
      const response: any = await friendApi.getList();
      if (response.code === 0) {
        setFriends(response.data);
      }
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  };

  // 邀请成员
  const handleInvite = async () => {
    if (!groupId || selectedFriends.length === 0) return;
    try {
      const response: any = await groupApi.inviteMembers(groupId, selectedFriends);
      if (response.code === 0) {
        message.success('邀请成功');
        setInviteVisible(false);
        setSelectedFriends([]);
        loadGroupInfo();
      }
    } catch (error: any) {
      message.error(error?.message || '邀请失败');
    }
  };

  // 移除成员
  const handleRemoveMember = async (userId: string) => {
    if (!groupId) return;
    try {
      const response: any = await groupApi.removeMember(groupId, userId);
      if (response.code === 0) {
        message.success('已移除成员');
        loadGroupInfo();
      }
    } catch (error: any) {
      message.error(error?.message || '操作失败');
    }
  };

  // 设置/取消管理员
  const handleSetAdmin = async (userId: string, role: 'admin' | 'member') => {
    if (!groupId) return;
    try {
      const response: any = await groupApi.setRole(groupId, userId, role);
      if (response.code === 0) {
        message.success(role === 'admin' ? '已设为管理员' : '已取消管理员');
        loadGroupInfo();
      }
    } catch (error: any) {
      message.error(error?.message || '操作失败');
    }
  };

  // 退出群组
  const handleQuit = async () => {
    if (!groupId) return;
    try {
      const response: any = await groupApi.quit(groupId);
      if (response.code === 0) {
        message.success('已退出群组');
        onClose();
        onQuit?.();
      }
    } catch (error: any) {
      message.error(error?.message || '操作失败');
    }
  };

  if (!group) return null;

  const currentMember = group.members.find((m) => m.userId === currentUserId);
  const isOwner = currentMember?.role === 'owner';
  const isAdmin = currentMember?.role === 'admin' || isOwner;

  // 过滤出可以邀请的好友（不在群里的）
  const memberIds = group.members.map((m) => m.userId);
  const availableFriends = friends.filter((f) => !memberIds.includes(f.friendId));

  return (
    <Modal
      title="群组信息"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={480}
      centered
      className="group-info-modal"
    >
      <div className="group-info-header">
        <Avatar
          size={64}
          src={group.avatar}
          icon={<TeamOutlined />}
          style={{ backgroundColor: '#07c160' }}
        />
        <div className="group-info-name">{group.name}</div>
        {group.announcement && (
          <div className="group-info-announcement">{group.announcement}</div>
        )}
        <div className="group-info-stats">
          共 {group.members.length} 人
        </div>
      </div>

      <div className="group-info-actions">
        {isAdmin && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              loadFriends();
              setInviteVisible(true);
            }}
          >
            邀请成员
          </Button>
        )}
        {!isOwner && (
          <Popconfirm
            title="确定要退出群组吗？"
            onConfirm={handleQuit}
            okText="确定"
            cancelText="取消"
          >
            <Button danger icon={<LogoutOutlined />}>
              退出群组
            </Button>
          </Popconfirm>
        )}
      </div>

      <div className="group-members">
        <List
          dataSource={group.members}
          renderItem={(member) => {
            const isSelf = member.userId === currentUserId;
            const canManage = isOwner && !isSelf;
            const canSetAdmin = isOwner && member.role !== 'owner';
            
            return (
              <List.Item
                actions={
                  canManage
                    ? [
                        <Popconfirm
                          key="remove"
                          title="确定要移除该成员吗？"
                          onConfirm={() => handleRemoveMember(member.userId)}
                          okText="确定"
                          cancelText="取消"
                        >
                          <Button type="link" danger size="small">
                            移除
                          </Button>
                        </Popconfirm>,
                      ]
                    : canSetAdmin && member.role === 'member'
                    ? [
                        <Button
                          key="setAdmin"
                          type="link"
                          size="small"
                          onClick={() => handleSetAdmin(member.userId, 'admin')}
                        >
                          设为管理员
                        </Button>,
                      ]
                    : canSetAdmin && member.role === 'admin'
                    ? [
                        <Button
                          key="unsetAdmin"
                          type="link"
                          size="small"
                          onClick={() => handleSetAdmin(member.userId, 'member')}
                        >
                          取消管理员
                        </Button>,
                      ]
                    : []
                }
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      src={member.user.avatar}
                      icon={<UserOutlined />}
                    />
                  }
                  title={
                    <span>
                      {member.nickname || member.user.nickname}
                      {member.role === 'owner' && (
                        <Tag color="gold" style={{ marginLeft: 8 }}>
                          <CrownOutlined /> 群主
                        </Tag>
                      )}
                      {member.role === 'admin' && (
                        <Tag color="blue" style={{ marginLeft: 8 }}>
                          <SafetyOutlined /> 管理员
                        </Tag>
                      )}
                    </span>
                  }
                  description={member.user.status === 'online' ? '在线' : '离线'}
                />
              </List.Item>
            );
          }}
        />
      </div>

      {/* 邀请成员弹窗 */}
      <Modal
        title="邀请成员"
        open={inviteVisible}
        onCancel={() => {
          setInviteVisible(false);
          setSelectedFriends([]);
        }}
        onOk={handleInvite}
        okText="邀请"
        cancelText="取消"
        centered
      >
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="选择要邀请的好友"
          value={selectedFriends}
          onChange={setSelectedFriends}
          options={availableFriends.map((f) => ({
            label: f.remark || f.nickname,
            value: f.friendId,
          }))}
        />
      </Modal>
    </Modal>
  );
};

export default GroupInfo;