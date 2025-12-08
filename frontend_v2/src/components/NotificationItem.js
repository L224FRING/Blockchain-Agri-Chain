import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import './NotificationItem.css';

const NotificationItem = ({ notification }) => {
  const { markAsRead, deleteNotification } = useNotifications();

  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteNotification(notification.id);
  };

  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div 
      className={`notification-item ${!notification.read ? 'unread' : ''}`}
      onClick={handleClick}
      style={{ borderLeftColor: notification.color || '#667eea' }}
    >
      <div className="notification-icon" style={{ background: notification.color || '#667eea' }}>
        {notification.icon || '📬'}
      </div>
      
      <div className="notification-content">
        <div className="notification-title">
          {notification.title}
          {!notification.read && <span className="unread-dot">●</span>}
        </div>
        <div className="notification-message">
          {notification.message}
        </div>
        <div className="notification-time">
          {getTimeAgo(notification.timestamp)}
        </div>
      </div>

      <button 
        className="notification-delete"
        onClick={handleDelete}
        aria-label="Delete notification"
        title="Delete"
      >
        ✕
      </button>
    </div>
  );
};

export default NotificationItem;
