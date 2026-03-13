import React, { memo } from 'react';
import { Avatar, Dropdown, Image, Button, message } from 'antd';
import { UserOutlined, RollbackOutlined, FileOutlined, DownloadOutlined } from '@ant-design/icons';
import { useAuthStore } from '@stores/authStore';
import type { Message } from '../../types';
import { formatTime } from '@utils/format';

interface MessageItemProps {
  msg: Message;
  isGroup: boolean;
  onRecall?: (messageId: string) => void;
}

// 图片消息组件
const ImageMessage: React.FC<{ fileId: string }> = memo(({ fileId }) => {
  const [imageUrl, setImageUrl] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const token = useAuthStore.getState().accessToken;
    const url = `/api/files/download/${fileId}?token=${token}`;
    setImageUrl(url);
    setLoading(false);
  }, [fileId]);

  if (loading) return <div>加载中...</div>;

  return (
    <Image
      src={imageUrl}
      alt="图片"
      style={{ maxWidth: 200, maxHeight: 200, borderRadius: 4 }}
      placeholder={<div style={{ width: 200, height: 150, background: '#f0f0f0' }} />}
    />
  );
});

ImageMessage.displayName = 'ImageMessage';

// 消息项组件 - 使用 memo 避免不必要的重渲染
const MessageItem: React.FC<MessageItemProps> = memo(({ msg, isGroup, onRecall }) => {
  const user = useAuthStore((state) => state.user);
  const isSelf = msg.senderId === user?.id;

  // 检查是否可以撤回（2分钟内）
  const canRecall = () => {
    if (msg.senderId !== user?.id || msg.recalledAt) return false;
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    return new Date(msg.createdAt) > twoMinutesAgo;
  };

  const msgCanRecall = canRecall();

  // 右键菜单项
  const contextMenuItems = isSelf ? [
    {
      key: 'recall',
      label: msgCanRecall ? '撤回消息' : '撤回消息 (超过2分钟)',
      icon: <RollbackOutlined />,
      disabled: !msgCanRecall,
      onClick: msgCanRecall && onRecall ? () => onRecall(msg.id) : undefined,
    },
  ] : [];

  // 渲染消息内容
  const renderContent = () => {
    // 已撤回消息
    if (msg.recalledAt) {
      return (
        <div className="message-recalled">
          <RollbackOutlined style={{ marginRight: 4 }} />
          {isSelf ? '你撤回了一条消息' : '对方撤回了一条消息'}
        </div>
      );
    }

    switch (msg.msgType) {
      case 'text':
        // 解析 @提及
        let content = msg.content || '';
        const mentionRegex = /@([^\s@]+)/g;
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;

        while ((match = mentionRegex.exec(content)) !== null) {
          if (match.index > lastIndex) {
            parts.push(content.slice(lastIndex, match.index));
          }
          parts.push(
            <span key={match.index} className="mention-highlight">
              {match[0]}
            </span>
          );
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < content.length) {
          parts.push(content.slice(lastIndex));
        }

        return <div className="message-text">{parts.length > 0 ? parts : content}</div>;

      case 'image':
        return (
          <div className="message-image">
            {msg.file?.id && <ImageMessage fileId={msg.file.id} />}
          </div>
        );

      case 'file':
        return (
          <div className="message-file-wrapper">
            <div className="message-file">
              <FileOutlined style={{ fontSize: 24, marginRight: 8 }} />
              <div className="file-info">
                <div className="filename">{msg.file?.filename}</div>
                <div className="filesize">
                  {((msg.file?.filesize || 0) / 1024).toFixed(2)} KB
                </div>
              </div>
            </div>
            <div className="file-download-btn">
              <Button
                type="text"
                icon={<DownloadOutlined style={{ fontSize: 18 }} />}
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const token = useAuthStore.getState().accessToken;
                    const response = await fetch(`/api/files/download/${msg.file?.id}`, {
                      headers: { 'Authorization': `Bearer ${token}` },
                    });
                    if (!response.ok) throw new Error('下载失败');
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = msg.file?.filename || 'download';
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  } catch (error) {
                    message.error('文件下载失败');
                  }
                }}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dropdown
      menu={{ items: contextMenuItems }}
      trigger={['contextMenu']}
    >
      <div
        id={`msg-${msg.id}`}
        className={`message-item ${isSelf ? 'self' : 'other'}`}
      >
        <Avatar
          size={36}
          src={isSelf ? user?.avatar : msg.sender.avatar}
          icon={<UserOutlined />}
        />
        <div className="message-content">
          {!isSelf && isGroup && (
            <div className="message-sender">
              {msg.sender.nickname || '未知用户'}
            </div>
          )}
          <div className="message-time">
            {formatTime(msg.createdAt)}
          </div>
          <div className={`message-bubble ${msg.msgType}`}>
            {renderContent()}
          </div>
        </div>
      </div>
    </Dropdown>
  );
});

MessageItem.displayName = 'MessageItem';

export default MessageItem;