import React, { useState, useEffect } from 'react';
import { Modal, Avatar, List, Button, Input, Select, message, Popconfirm, Tag, Divider } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  UserAddOutlined,
  DeleteOutlined,
  CrownOutlined,
  SafetyOutlined,
  LogoutOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { groupApi, friendApi } from '@services/api';
import { useAuthStore } from '@stores/authStore';
import type { GroupMember } from '@types/index';
import './GroupDetail.css';

interface GroupDetailProps {
  visible: boolean;
  groupId: string;
  onClose: () => void;
  onRefresh?: () => void;
}

const GroupDetail: React.FC<GroupDetailProps> = ({ visible, groupId, onClose, onRefresh }) => {
  const { user } = useAuthStore();
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  useEffect(() => {
    if (visible && groupId) {
      loadGroupDetail();
    }
  }, [visible, groupId]);

  const loadGroupDetail = async () => {
    setLoading(true);
    try {
      const response: any = await groupApi.getDetail(groupId);
      if (response.code === 0) {
        setGroupInfo(response.data);
        setMembers(response.data.members || []);
      }
    } catch (error) {
      message.error('加载群组信息失败');
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
      console.error('Load friends failed:', error);
    }
  };

  // 获取当前用户的角色
  const myRole = members.find((m) => m.userId === user?.id)?.role;
  const isOwner = myRole === 'owner';
  const isAdmin = myRole === 'admin' || isOwner;

  // 邀请成员
  const handleInvite = async () => {
    if (selectedFriends.length === 0) {
      message.warning('请选择要邀请的好友');
      return;
    }
    try {
      const response: any = await groupApi.inviteMembers(groupId, selectedFriends);
      if (response.code === 0) {
        message.success('邀请成功');
        setInviteVisible(false);
        setSelectedFriends([]);
        loadGroupDetail();
        onRefresh?.();
      }
    } catch (error: any) {
      message.error(error?.message || '邀请失败');
    }
  };

  // 移除成员
  const handleRemoveMember = async (memberId: string) => {
    try {
      const response: any = await groupApi.removeMember(groupId, memberId);
      if (response.code === 0) {
        message.success('已移除成员');
        loadGroupDetail();
      }
    } catch (error: any) {
      message.error(error?.message || '移除失败');
    }
  };

  // 设置/取消管理员
  const handleSetAdmin = async (memberId: string, role: 'admin' | 'member') => {
    try {
      const response: any = await groupApi.setMemberRole(groupId, memberId, role);
      if (response.code === 0) {
        message.success(role === 'admin' ? '已设为管理员' : '已取消管理员');
        loadGroupDetail();
      }
    } catch (error: any) {
      message.error(error?.message || '操作失败');
    }
  };

  // 退出群组
  const handleQuit = async () => {
    try {
      const response: any = await groupApi.quit(groupId);
      if (response.code === 0) {
        message.success('已退出群组');
        onClose();
        onRefresh?.();
      }
    } catch (error: any) {
      message.error(error?.message || '退出失败');
    }
  };

  // 解散群组
  const handleDismiss = async () => {
    try {
      const response: any = await groupApi.dismiss(groupId);
      if (response.code === 0) {
        message.success('群组已解散');
        onClose();
        onRefresh?.();
      }
    } catch (error: any) {
      message.error(error?.message || '解散失败');
    }
  };

  // 渲染角色标签
  const renderRoleTag = (role: string) => {
    switch (role) {
      case 'owner':
        return <Tag icon={<CrownOutlined />} color="gold">群主</Tag>;
      case 'admin':
        return <Tag icon={<SafetyOutlined />} color="blue">管理员</Tag>;
      default:
        return null;
    }
  };

  // 过滤可选的好友（排除已在群内的）
  const availableFriends = friends.filter(
    (f) => !members.some((m) => m.userId === f.friendId)
  );

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TeamOutlined />
          <span>{groupInfo?.name || '群组详情'}</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={480}
      className="group-detail-modal"
    >
      {/* 群公告 */}
      {groupInfo?.announcement && (
        <div className="group-announcement">
          <div className="announcement-label">群公告</div>
          <div className="announcement-content">{groupInfo.announcement}</div>
        </div>
      )}

      <Divider style={{ margin: '12px 0' }} />

      {/* 成员列表 */}
      <div className="members-header">
        <span>群成员 ({members.length}人)</span>
        {isAdmin && (
          <Button
            type="link"
            icon={<UserAddOutlined />}
            onClick={() => {
              loadFriends();
              setInviteVisible(true);
            }}
          >
            邀请成员
          </Button>
        )}
      </div>

      <List
        loading={loading}
        dataSource={members}
        renderItem={(member) => (
          <List.Item
            actions={
              isOwner && member.role !== 'owner' ? (
                [
                  <Button
                    key="admin"
                    type="link"
                    size="small"
                    onClick={() => handleSetAdmin(member.userId, member.role === 'admin' ? 'member' : 'admin')}
                  >
                    {member.role === 'admin' ? '取消管理' : '设为管理'}
                  </Button>,
                  <Popconfirm
                    key="remove"
                    title="确定移除该成员？"
                    onConfirm={() => handleRemoveMember(member.userId)}
                  >
                    <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                      移除
                    </Button>
                  </Popconfirm>,
                ]
              ) : isAdmin && member.role === 'member' ? (
                [
                  <Popconfirm
                    key="remove"
                    title="确定移除该成员？"
                    onConfirm={() => handleRemoveMember(member.userId)}
                  >
                    <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                      移除
                    </Button>
                  </Popconfirm>,
                ]
              ) : null
            }
          >
            <List.Item.Meta
              avatar={
                <Avatar
                  size={40}
                  src={member.user?.avatar}
                  icon={<UserOutlined />}
                  style={{ borderRadius: 4 }}
                />
              }
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{member.nickname || member.user?.nickname || '未知用户'}</span>
                  {renderRoleTag(member.role)}
                </div>
              }
            />
          </List.Item>
        )}
      />

      <Divider style={{ margin: '16px 0 12px' }} />

      {/* 操作按钮 */}
      <div className="group-actions">
        {isOwner ? (
          <Popconfirm
            title="解散群组"
            description="解散后群聊记录将被清空，确定解散？"
            onConfirm={handleDismiss}
          >
            <Button danger block icon={<DeleteOutlined />}>
              解散群组
            </Button>
          </Popconfirm>
        ) : (
          <Popconfirm
            title="退出群组"
            description="确定退出该群组？"
            onConfirm={handleQuit}
          >
            <Button danger block icon={<LogoutOutlined />}>
              退出群组
            </Button>
          </Popconfirm>
        )}
      </div>

      {/* 邀请成员弹窗 */}
      <Modal
        title="邀请成员"
        open={inviteVisible}
        onCancel={() => setInviteVisible(false)}
        onOk={handleInvite}
        okText="邀请"
        cancelText="取消"
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
        {availableFriends.length === 0 && (
          <div style={{ color: '#999', marginTop: 8, textAlign: 'center' }}>
            没有可邀请的好友
          </div>
        )}
      </Modal>
    </Modal>
  );
};

export default GroupDetail;