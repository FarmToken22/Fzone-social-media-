import { auth, database } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { ref, push, set, get, update, query, orderByChild, limitToLast, onValue, off } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { formatTimeAgo, getInitials } from './utils.js';

// Notification System

let currentUser = null;
let notificationsUnsubscribe = null;

// DOM Elements
const loadingIndicator = document.getElementById('loadingIndicator');
const notificationsList = document.getElementById('notificationsList');
const markAllBtn = document.getElementById('markAllBtn');

// Auth Check
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadNotifications(user.uid);
    } else {
        window.location.href = 'index.html';
    }
});

// Create Notification
export async function createNotification(data) {
    try {
        const notificationsRef = ref(database, `notifications/${data.recipientId}`);
        const newNotificationRef = push(notificationsRef);

        const notification = {
            type: data.type, // 'like', 'comment', 'follow'
            senderId: data.senderId,
            senderName: data.senderName,
            postId: data.postId || null,
            commentId: data.commentId || null,
            message: data.message,
            createdAt: Date.now(),
            read: false
        };

        await set(newNotificationRef, notification);

        return {
            success: true,
            notificationId: newNotificationRef.key
        };
    } catch (error) {
        console.error('Error creating notification:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Load Notifications
function loadNotifications(userId) {
    loadingIndicator.style.display = 'block';

    const notificationsRef = ref(database, `notifications/${userId}`);
    
    notificationsUnsubscribe = onValue(notificationsRef, (snapshot) => {
        loadingIndicator.style.display = 'none';

        if (!snapshot.exists()) {
            displayEmptyState();
            return;
        }

        const notificationsData = snapshot.val();
        const notifications = [];

        Object.keys(notificationsData).forEach(key => {
            notifications.push({
                id: key,
                ...notificationsData[key]
            });
        });

        // Sort by timestamp (newest first)
        notifications.sort((a, b) => b.createdAt - a.createdAt);

        displayNotifications(notifications);
    });
}

// Display Notifications
function displayNotifications(notifications) {
    if (notifications.length === 0) {
        displayEmptyState();
        return;
    }

    notificationsList.innerHTML = '';

    notifications.forEach(notification => {
        const notificationEl = createNotificationElement(notification);
        notificationsList.appendChild(notificationEl);
    });
}

// Create Notification Element
function createNotificationElement(notification) {
    const div = document.createElement('div');
    div.className = `notification-item ${notification.read ? '' : 'unread'}`;
    
    const timeAgo = formatTimeAgo(notification.createdAt);
    const icon = getNotificationIcon(notification.type);
    const iconClass = notification.type;

    div.onclick = () => handleNotificationClick(notification);

    div.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon ${iconClass}">${icon}</div>
            <div class="notification-body">
                <div class="notification-text">
                    <strong>${notification.senderName}</strong> ${notification.message}
                </div>
                <div class="notification-time">${timeAgo}</div>
            </div>
        </div>
    `;

    return div;
}

// Get Notification Icon
function getNotificationIcon(type) {
    const icons = {
        'like': '👍',
        'comment': '💬',
        'follow': '👤',
        'mention': '@',
        'share': '📤'
    };
    return icons[type] || '🔔';
}

// Handle Notification Click
async function handleNotificationClick(notification) {
    // Mark as read
    if (!notification.read) {
        await markNotificationAsRead(notification.id);
    }

    // Navigate based on type
    if (notification.postId) {
        window.location.href = `post.html?id=${notification.postId}`;
    }
}

// Mark Notification as Read
async function markNotificationAsRead(notificationId) {
    try {
        const notificationRef = ref(database, `notifications/${currentUser.uid}/${notificationId}`);
        await update(notificationRef, { read: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Mark All as Read
markAllBtn.addEventListener('click', async () => {
    try {
        const notificationsRef = ref(database, `notifications/${currentUser.uid}`);
        const snapshot = await get(notificationsRef);

        if (!snapshot.exists()) return;

        const notifications = snapshot.val();
        const updates = {};

        Object.keys(notifications).forEach(key => {
            if (!notifications[key].read) {
                updates[`notifications/${currentUser.uid}/${key}/read`] = true;
            }
        });

        if (Object.keys(updates).length > 0) {
            const dbRef = ref(database);
            await update(dbRef, updates);
        }

        markAllBtn.textContent = '✓ All marked as read';
        setTimeout(() => {
            markAllBtn.textContent = 'Mark all as read';
        }, 2000);

    } catch (error) {
        console.error('Error marking all as read:', error);
    }
});

// Display Empty State
function displayEmptyState() {
    notificationsList.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">🔔</div>
            <div class="empty-text">No notifications</div>
            <div class="empty-subtext">You don't have any notifications yet</div>
        </div>
    `;
}

// Get Unread Count
export async function getUnreadCount(userId) {
    try {
        const notificationsRef = ref(database, `notifications/${userId}`);
        const snapshot = await get(notificationsRef);

        if (!snapshot.exists()) {
            return { success: true, count: 0 };
        }

        const notifications = snapshot.val();
        let unreadCount = 0;

        Object.keys(notifications).forEach(key => {
            if (!notifications[key].read) {
                unreadCount++;
            }
        });

        return {
            success: true,
            count: unreadCount
        };
    } catch (error) {
        console.error('Error getting unread count:', error);
        return { success: false, count: 0 };
    }
}

// Cleanup
window.addEventListener('beforeunload', () => {
    if (notificationsUnsubscribe) {
        notificationsUnsubscribe();
    }
});