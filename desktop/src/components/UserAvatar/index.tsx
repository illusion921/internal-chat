import React from 'react';
import { Avatar, AvatarProps } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { getAvatarUrl } from '@utils/asset';

interface UserAvatarProps extends AvatarProps {
  src?: string | null;
}

/**
 * 用户头像组件
 * 自动处理相对路径的头像URL
 */
const UserAvatar: React.FC<UserAvatarProps> = ({ src, ...props }) => {
  return (
    <Avatar
      {...props}
      src={getAvatarUrl(src)}
      icon={!src ? <UserOutlined /> : undefined}
    />
  );
};

export default UserAvatar;