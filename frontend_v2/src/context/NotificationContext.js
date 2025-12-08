import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { SUPPLY_CHAIN_ABI, SUPPLY_CHAIN_ADDRESS, ROLE_MANAGER_ABI, ROLE_MANAGER_ADDRESS } from '../config';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children, connectedWallet }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications from localStorage
  useEffect(() => {
    if (connectedWallet) {
      const saved = localStorage.getItem(`notifications_${connectedWallet}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setNotifications(parsed);
          setUnreadCount(parsed.filter(n => !n.read).length);
        } catch (e) {
          console.error('Error loading notifications:', e);
        }
      }
    }
  }, [connectedWallet]);

  // Save notifications to localStorage
  useEffect(() => {
    if (connectedWallet && notifications.length > 0) {
      localStorage.setItem(
        `notifications_${connectedWallet}`,
        JSON.stringify(notifications.slice(0, 100)) // Keep last 100
      );
    }
  }, [notifications, connectedWallet]);

  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: Date.now() + Math.random(), // Ensure uniqueness
      timestamp: Date.now(),
      read: false,
      ...notification
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 100));
    setUnreadCount(prev => prev + 1);

    // Play notification sound (optional)
    if (notification.playSound !== false) {
      playNotificationSound();
    }

    return newNotification.id;
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const deleteNotification = useCallback((id) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    if (connectedWallet) {
      localStorage.removeItem(`notifications_${connectedWallet}`);
    }
  }, [connectedWallet]);

  // Listen to blockchain events
  useEffect(() => {
    if (!connectedWallet || !window.ethereum) return;

    let supplyChainContract;
    let roleManagerContract;
    let isSubscribed = true;
    const setupTime = Date.now(); // Track when listeners were set up
    const recentNotifications = new Set(); // Track recent notifications to prevent duplicates

    const setupListeners = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        supplyChainContract = new ethers.Contract(SUPPLY_CHAIN_ADDRESS, SUPPLY_CHAIN_ABI, provider);
        roleManagerContract = new ethers.Contract(ROLE_MANAGER_ADDRESS, ROLE_MANAGER_ABI, provider);

        console.log(`📡 Starting notification listeners at ${new Date(setupTime).toLocaleTimeString()}`);

        const myAddress = connectedWallet.toLowerCase();
        
        // Helper to check if we should process this notification
        const shouldNotify = (key) => {
          if (recentNotifications.has(key)) {
            return false; // Already notified
          }
          recentNotifications.add(key);
          // Clean up old entries after 10 seconds
          setTimeout(() => recentNotifications.delete(key), 10000);
          return true;
        };

        // Transfer Proposed (Wholesaler receives)
        const transferProposedFilter = supplyChainContract.filters.TransferProposed();
        supplyChainContract.on(transferProposedFilter, (productId, from, toUsername, toAddress) => {
          if (!isSubscribed) return;
          
          const key = `transfer_proposed_${productId}_${toAddress}`;
          if (!shouldNotify(key)) return;
          
          console.log('✅ TransferProposed event:', { 
            productId: Number(productId), 
            from, 
            toUsername, 
            toAddress, 
            myAddress
          });
          
          if (toAddress.toLowerCase() === myAddress) {
            addNotification({
              type: 'transfer_proposed',
              title: '📥 New Transfer Proposal',
              message: `Product #${Number(productId)} proposed by farmer`,
              productId: Number(productId),
              from: from,
              icon: '📦',
              color: '#2196F3'
            });
          }
        });

        // Transfer Confirmed (Farmer gets notified)
        const transferConfirmedFilter = supplyChainContract.filters.TransferConfirmed();
        supplyChainContract.on(transferConfirmedFilter, async (productId, by, role) => {
          if (!isSubscribed) return;
          
          const key = `transfer_confirmed_${productId}_${role}`;
          if (!shouldNotify(key)) return;
          
          // Get product to check if I'm the farmer
          try {
            const product = await supplyChainContract.getProductById(productId);
            if (isSubscribed && product.farmer.toLowerCase() === myAddress && role === 'Wholesaler') {
              addNotification({
                type: 'transfer_confirmed',
                title: '✅ Transfer Confirmed',
                message: `Wholesaler accepted Product #${Number(productId)}`,
                productId: Number(productId),
                icon: '✅',
                color: '#4CAF50'
              });
            }
          } catch (error) {
            console.error('Error processing TransferConfirmed:', error);
          }
        });

        // Retailer Purchase Proposed (Wholesaler receives)
        const retailerPurchaseProposedFilter = supplyChainContract.filters.RetailerPurchaseProposed();
        supplyChainContract.on(retailerPurchaseProposedFilter, (productId, retailer, wholesaler, price) => {
          if (!isSubscribed) return;
          
          const key = `retailer_purchase_proposed_${productId}_${retailer}`;
          if (!shouldNotify(key)) return;
          
          if (wholesaler.toLowerCase() === myAddress) {
            addNotification({
              type: 'retailer_purchase_proposed',
              title: '🛒 Purchase Proposal',
              message: `Retailer wants to buy Product #${Number(productId)} for ₹${ethers.formatUnits(price, 0)}`,
              productId: Number(productId),
              from: retailer,
              icon: '💰',
              color: '#FF9800'
            });
          }
        });

        // Retailer Purchase Confirmed (Retailer gets notified)
        const retailerPurchaseConfirmedFilter = supplyChainContract.filters.RetailerPurchaseConfirmed();
        supplyChainContract.on(retailerPurchaseConfirmedFilter, (productId, wholesaler, retailer) => {
          if (!isSubscribed) return;
          
          const key = `retailer_purchase_confirmed_${productId}_${retailer}`;
          if (!shouldNotify(key)) return;
          
          if (retailer.toLowerCase() === myAddress) {
            addNotification({
              type: 'retailer_purchase_confirmed',
              title: '✅ Purchase Confirmed',
              message: `Wholesaler confirmed Product #${Number(productId)}. Payment sent!`,
              productId: Number(productId),
              icon: '✅',
              color: '#4CAF50'
            });
          }
        });

        // Retailer Proposal Rejected (Retailer gets notified)
        const retailerProposalRejectedFilter = supplyChainContract.filters.RetailerProposalRejected();
        supplyChainContract.on(retailerProposalRejectedFilter, (productId, wholesaler, retailer) => {
          if (!isSubscribed) return;
          
          const key = `retailer_proposal_rejected_${productId}_${retailer}`;
          if (!shouldNotify(key)) return;
          
          if (retailer.toLowerCase() === myAddress) {
            addNotification({
              type: 'retailer_proposal_rejected',
              title: '❌ Proposal Rejected',
              message: `Wholesaler rejected your proposal for Product #${Number(productId)}. Payment refunded.`,
              productId: Number(productId),
              icon: '❌',
              color: '#f44336'
            });
          }
        });

        // Product Listed For Sale (Consumers can see) - DISABLED to reduce noise
        // supplyChainContract.on('ProductListedForSale', (productId, oldPrice, newPrice, retailer, event) => {
        //   if (!isSubscribed) return;
        //   addNotification({
        //     type: 'product_listed',
        //     title: '🏪 New Product Available',
        //     message: `Product #${productId} now for sale at ₹${ethers.formatUnits(newPrice, 0)}`,
        //     productId: Number(productId),
        //     icon: '🛍️',
        //     color: '#9C27B0',
        //     playSound: false
        //   });
        // });

        // Consumer Purchase (Retailer gets notified)
        const consumerPurchaseFilter = supplyChainContract.filters.ConsumerPurchase();
        supplyChainContract.on(consumerPurchaseFilter, (productId, consumer, retailer, price) => {
          if (!isSubscribed) return;
          
          const key = `consumer_purchase_${productId}_${consumer}`;
          if (!shouldNotify(key)) return;
          
          if (retailer.toLowerCase() === myAddress) {
            addNotification({
              type: 'consumer_purchase',
              title: '💰 Product Sold!',
              message: `Product #${Number(productId)} sold for ₹${ethers.formatUnits(price, 0)}`,
              productId: Number(productId),
              icon: '💰',
              color: '#4CAF50'
            });
          }
        });

        // Product Rated (User being rated gets notified)
        const productRatedFilter = supplyChainContract.filters.ProductRated();
        supplyChainContract.on(productRatedFilter, (productId, ratedBy, userRated, score) => {
          if (!isSubscribed) return;
          
          const key = `rating_received_${productId}_${userRated}_${score}`;
          if (!shouldNotify(key)) return;
          
          if (userRated.toLowerCase() === myAddress) {
            addNotification({
              type: 'rating_received',
              title: '⭐ New Rating',
              message: `You received ${Number(score)} stars for Product #${Number(productId)}`,
              productId: Number(productId),
              rating: Number(score),
              icon: '⭐',
              color: '#FFC107'
            });
          }
        });

        // Role Assigned (New user registration) - DISABLED to prevent spam
        // This event fires for all past registrations when page loads
        // Uncomment only if you want to see registration notifications
        /*
        const roleAssignedFilter = roleManagerContract.filters.RoleAssigned();
        roleManagerContract.on(roleAssignedFilter, (user, role, username, event) => {
          if (!isSubscribed || isEventProcessed(event)) return;
          if (user.toLowerCase() === myAddress) {
            const roleNames = ['None', 'Farmer', 'Wholesaler', 'Retailer', 'Consumer'];
            addNotification({
              type: 'role_assigned',
              title: '🎉 Welcome to AgriChain!',
              message: `You're registered as ${roleNames[role]} (${username})`,
              icon: '🎉',
              color: '#4CAF50'
            });
          }
        });
        */

        console.log('✅ Notification listeners set up');
      } catch (error) {
        console.error('Error setting up notification listeners:', error);
      }
    };

    setupListeners();

    // Cleanup listeners
    return () => {
      isSubscribed = false; // Prevent any pending notifications
      if (supplyChainContract) {
        supplyChainContract.removeAllListeners();
      }
      if (roleManagerContract) {
        roleManagerContract.removeAllListeners();
      }
      console.log('🔇 Notification listeners removed');
    };
  }, [connectedWallet, addNotification]);

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Helper function to play notification sound
function playNotificationSound() {
  try {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (error) {
    // Silently fail if audio not supported
    console.debug('Audio notification not available');
  }
}
