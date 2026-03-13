import React, { useState, useEffect, useRef } from 'react';
import { Avatar, Input } from 'antd';
import { UserOutlined } from '@ant-design/icons';

interface Member {
  userId: string;
  user?: {
    id: string;
    nickname: string;
    avatar?: string;
  };
  role: string;
  nickname?: string;
}

interface MentionSelectorProps {
  members: Member[];
  visible: boolean;
  position: { top: number; left: number };
  onSelect: (member: Member) => void;
  onClose: () => void;
}

const MentionSelector: React.FC<MentionSelectorProps> = ({
  members,
  visible,
  position,
  onSelect,
  onClose,
}) => {
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredMembers = members.filter((m) => {
    const name = m.nickname || m.user?.nickname || '';
    return name.toLowerCase().includes(filter.toLowerCase());
  });

  useEffect(() => {
    setFilter('');
    setSelectedIndex(0);
  }, [visible]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!visible) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredMembers.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredMembers[selectedIndex]) {
            onSelect(filteredMembers[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, filteredMembers, selectedIndex, onSelect, onClose]);

  if (!visible) return null;

  return (
    <div
      className="mention-selector"
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        zIndex: 1000,
      }}
    >
      <div className="mention-search">
        <Input
          placeholder="搜索成员..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          autoFocus
          style={{ marginBottom: 8 }}
        />
      </div>
      <div className="mention-list" ref={listRef}>
        {filteredMembers.map((member, index) => (
          <div
            key={member.userId}
            className={`mention-item ${index === selectedIndex ? 'selected' : ''}`}
            onClick={() => onSelect(member)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <Avatar
              size={28}
              src={member.user?.avatar}
              icon={<UserOutlined />}
            />
            <span className="mention-name">
              {member.nickname || member.user?.nickname || '未知用户'}
            </span>
          </div>
        ))}
        {filteredMembers.length === 0 && (
          <div className="mention-empty">没有匹配的成员</div>
        )}
      </div>
    </div>
  );
};

export default MentionSelector;