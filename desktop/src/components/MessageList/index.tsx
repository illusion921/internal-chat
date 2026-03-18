import React from 'react';
import { Avatar, Image, Spin, Empty, Progress, Tag, Button, message } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  FileOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@stores/authStore';
import { getAvatarUrl } from '@utils/asset';
import { formatTime } from '@utils/format';
import { config } from '@src/config';
import type { Message } from '@types/index';
import './MessageList.css';

interface ImageMessageProps {
  fileId: string;
}

const ImageMessage: React.FC<ImageMessageProps> = ({ fileId }) => {
  const [imageUrl, setImageUrl] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const { accessToken } = useAuthStore.getState();

  React.useEffect(() => {
    const loadImage = async () => {
      try {
        const response = await fetch(`${config.apiBaseUrl}/files/download/${fileId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
        }
      } catch (error) {
        console.error('Failed to load image:', error);
      } finally {
        setLoading(false);
      }
    };
    loadImage();

    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [fileId, accessToken]);

  if (loading) {
    return <Spin />;
  }

  if (!imageUrl) {
    return <span style={{ color: '#999' }}>图片加载失败</span>;
  }

  return (
    <Image
      src={imageUrl}
      alt="图片"
      style={{ maxWidth: 300, maxHeight: 300, borderRadius: 8 }}
    />
  );
};

interface FileMessageProps {
  file: Message['file'];
}

const FileMessage: React.FC<FileMessageProps> = ({ file }) => {
  const { accessToken } = useAuthStore.getState();

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`${config.apiBaseUrl}/files/download/${file?.id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error('下载失败');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file?.filename || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      message.error('文件下载失败');
    }
  };

  return (
    <div className="message-file-wrapper">
      <div className="message-file">
        <FileOutlined style={{ fontSize: 24, marginRight: 8 }} />
        <div className="file-info">
          <div className="filename">{file?.filename}</div>
          <div className="filesize">{((file?.filesize || 0) / 1024).toFixed(2)} KB</div>
        </div>
      </div>
      <div className="file-download-btn">
        <Button
          type="text"
          icon={<DownloadOutlined style={{ fontSize: 18 }} />}
          onClick={handleDownload}
        />
      </div>
    </div>
  );
};

interface MessageItemProps {
  msg: Message;
  isSelf: boolean;
  showSender?: boolean;
  currentConversationType?: 'private' | 'group';
}

/**
 * 单条消息组件
 */
export const MessageItem: React.FC<MessageItemProps> = ({
  msg,
  isSelf,
  showSender = false,
  currentConversationType,
}) => {
  const { user } = useAuthStore.getState();

  const renderMessageContent = () => {
    switch (msg.msgType) {
      case 'text':
        return <div className="message-text">{msg.content}</div>;
      case 'image':
        return msg.file?.id ? <ImageMessage fileId={msg.file.id} /> : null;
      case 'file':
        return msg.file ? <FileMessage file={msg.file} /> : null;
      default:
        return null;
    }
  };

  if (msg.recalledAt) {
    return (
      <div className={`message-item ${isSelf ? 'self' : 'other'} recalled`}>
        {!isSelf && (
          <Avatar
            size={36}
            src={getAvatarUrl(msg.sender.avatar)}
            icon={<UserOutlined />}
          />
        )}
        <div className="message-content">
          <div className="message-time">{formatTime(msg.recalledAt)}</div>
          <div className="message-bubble recalled">消息已撤回</div>
        </div>
        {isSelf && (
          <Avatar
            size={36}
            src={getAvatarUrl(user?.avatar)}
            icon={<UserOutlined />}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`message-item ${isSelf ? 'self' : 'other'}`}>
      {!isSelf && (
        <Avatar
          size={36}
          src={getAvatarUrl(msg.sender.avatar)}
          icon={<UserOutlined />}
        />
      )}
      <div className="message-content">
        {!isSelf && currentConversationType === 'group' && showSender && (
          <div className="message-sender">
            {msg.sender.nickname || '未知用户'}
            {msg.sender.id && (
              <span className="sender-tags">
                {msg.sender.id === 'owner' && <Tag color="gold">群主</Tag>}
                {msg.sender.id === 'admin' && <Tag color="blue">管理员</Tag>}
              </span>
            )}
          </div>
        )}
        <div className="message-meta">
          <div className="message-time">{formatTime(msg.createdAt)}</div>
        </div>
        <div className={`message-bubble ${msg.msgType}`}>
          {renderMessageContent()}
        </div>
      </div>
      {isSelf && (
        <Avatar
          size={36}
          src={getAvatarUrl(user?.avatar)}
          icon={<UserOutlined />}
        />
      )}
    </div>
  );
};

interface UploadProgressProps {
  uploadId: string;
  progress: number;
  filename: string;
}

/**
 * 文件上传进度组件
 */
export const UploadProgress: React.FC<UploadProgressProps> = ({
  progress,
  filename,
}) => {
  const { user } = useAuthStore.getState();

  return (
    <div className="message-item self">
      <div className="message-content">
        <div className="upload-progress-wrapper">
          <div className="upload-progress-file">
            <FileOutlined style={{ fontSize: 24, marginRight: 8, color: '#07c160' }} />
            <div className="upload-progress-info">
              <div className="filename">{filename}</div>
              <div className="upload-progress-bar">
                <Progress percent={progress} size="small" strokeColor="#07c160" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <Avatar
        size={36}
        src={getAvatarUrl(user?.avatar)}
        icon={<UserOutlined />}
      />
    </div>
  );
};

interface MessageListProps {
  messages: Message[];
  currentConversationType?: 'private' | 'group';
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  uploadProgress?: { [key: string]: { progress: number; filename: string } };
}

/**
 * 消息列表组件（支持虚拟滚动）
 */
const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentConversationType,
  hasMore,
  loading,
  onLoadMore,
  uploadProgress = {},
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  return (
    <div className="messages-container" ref={containerRef}>
      {hasMore && (
        <div className="load-more">
          <Button type="link" onClick={onLoadMore} loading={loading}>
            加载更多
          </Button>
        </div>
      )}

      {messages.length === 0 && !loading && (
        <div className="messages-empty">
          <Empty description="暂无消息" />
        </div>
      )}

      <div className="messages-list">
        {messages.map((msg) => {
          const isSelf = msg.senderId === useAuthStore.getState().user?.id;
          const isGroup = currentConversationType === 'group';

          return (
            <MessageItem
              key={msg.id}
              msg={msg}
              isSelf={isSelf}
              showSender={isGroup}
              currentConversationType={currentConversationType}
            />
          );
        })}

        {/* 文件上传进度 */}
        {Object.entries(uploadProgress).map(([id, { progress, filename }]) => (
          <UploadProgress
            key={id}
            uploadId={id}
            progress={progress}
            filename={filename}
          />
        ))}
      </div>
    </div>
  );
};

export default MessageList;
