import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import NotificationItem from './NotificationItem';
import './NotificationCenter.css';

const NotificationCenter = ({ onClose }) => {
  const { notifications, unreadCount, markAllAsRead, clearAll } = useNotifications();

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      clearAll();
    }
  };

  return (
    <div className="notification-center">
      <div className="notification-header">
        <h3>
          Notifications
          {unreadCount > 0 && ` (${unreadCount})`}
        </h3>
        <div className="notification-actions">
          {unreadCount > 0 && (
            <button 
              className="notification-action-btn"
              onClick={handleMarkAllRead}
              title="Mark all as read"
            >
              ✓ Read All
            </button>
          )}
          {notifications.length > 0 && (
            <button 
              className="notification-action-btn"
              onClick={handleClearAll}
              title="Clear all notifications"
            >
              🗑️ Clear
            </button>
          )}
        </div>
      </div>

      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="notification-empty">
            <div className="notification-empty-icon">🔔</div>
            <p>No notifications yet</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: '#bbb' }}>
              You'll see updates here when something happens
            </p>
          </div>
        ) : (
          notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
            />
          ))
        )}
      </div>

      {notifications.length > 10 && (
        <div className="notification-footer">
          <button className="view-all-btn" onClick={onClose}>
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
