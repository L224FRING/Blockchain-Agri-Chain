import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import NotificationCenter from './NotificationCenter';
import './NotificationBell.css';

const NotificationBell = () => {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="notification-bell-container">
      <button 
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        title={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="notification-overlay"
            onClick={() => setIsOpen(false)}
          />
          <NotificationCenter onClose={() => setIsOpen(false)} />
        </>
      )}
    </div>
  );
};

export default NotificationBell;
