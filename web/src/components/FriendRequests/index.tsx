import React from 'react';
import { Avatar, Button, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useContactStore } from '@stores/index';
import { friendApi } from '@services/api';
import './FriendRequests.css';

const FriendRequests: React.FC = () => {
  const { friendRequests, setFriendRequests } = useContactStore();

  const handleFriendRequest = async (id: string, action: 'accept' | 'reject') => {
    try {
      const response: any = await friendApi.handleRequest(id, action);
      if (response.code === 0) {
        message.success(action === 'accept' ? '已添加好友' : '已拒绝');
        setFriendRequests(friendRequests.filter((r) => r.id !== id));
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  return (
    <div className="friend-requests-container">
      <div className="friend-requests-header">
        <h3>好友申请</h3>
        <span className="request-count">
          {friendRequests.length > 0 ? `${friendRequests.length} 条待处理` : ''}
        </span>
      </div>
      <div className="friend-requests-list">
        {friendRequests.length === 0 ? (
          <div className="empty-tip">暂无好友申请</div>
        ) : (
          friendRequests.map((request) => (
            <div key={request.id} className="request-item">
              <div className="request-avatar">
                <Avatar
                  size={48}
                  src={request.from.avatar}
                  icon={<UserOutlined />}
                  style={{ borderRadius: 4 }}
                />
              </div>
              <div className="request-info">
                <div className="request-name">{request.from.nickname}</div>
                <div className="request-message">{request.message || '请求添加你为好友'}</div>
              </div>
              <div className="request-actions">
                <Button
                  type="primary"
                  size="small"
                  style={{ background: '#07c160', borderColor: '#07c160' }}
                  onClick={() => handleFriendRequest(request.id, 'accept')}
                >
                  接受
                </Button>
                <Button size="small" onClick={() => handleFriendRequest(request.id, 'reject')}>
                  拒绝
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FriendRequests;