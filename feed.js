import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getAllPosts, listenToPosts } from './database.js';
import { formatTimeAgo, getInitials, showError, toggleLoading } from './utils.js';
import { togglePostLike, hasUserLiked } from './like.js';
import { getActiveAds, insertAdsIntoFeed, createAdCard } from './ads.js';

// Global State
let currentUser = null;
let postsUnsubscribe = null;

// DOM Elements
const postsContainer = document.getElementById('postsContainer');
const loadingIndicator = document.getElementById('loadingIndicator');
const userAvatar = document.getElementById('userAvatar');

// Auth State Check
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        initializeFeed();
        updateUserUI(user);
    } else {
        // User logged out - redirect to login page
        window.location.href = 'index.html';
    }
});

// Update User UI
function updateUserUI(user) {
    const displayName = user.displayName || user.email.split('@')[0];
    const initials = getInitials(displayName);
    
    if (userAvatar) {
        userAvatar.textContent = initials;
        userAvatar.title = displayName;
    }
}

// Initialize Feed
function initializeFeed() {
    loadPosts();
    
    // Close menus when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.post-menu-btn') && !e.target.closest('.post-menu')) {
            closeAllMenus();
        }
    });
}

// Close all menus
function closeAllMenus() {
    document.querySelectorAll('.post-menu').forEach(menu => {
        menu.classList.remove('show');
    });
}

// Load Posts
async function loadPosts() {
    toggleLoading(true);
    
    // Setup real-time listener
    postsUnsubscribe = listenToPosts(async (result) => {
        toggleLoading(false);
        
        if (result.success) {
            // Get active ads
            const adsResult = await getActiveAds('card', 'middle');
            let postsWithAds = result.posts;
            
            // Insert ads into feed every 5 posts
            if (adsResult.success && adsResult.ads.length > 0) {
                postsWithAds = insertAdsIntoFeed(result.posts, adsResult.ads, 5);
            }
            
            displayPosts(postsWithAds);
        } else {
            showError('Failed to load posts');
            displayEmptyState();
        }
    });
}

// Display Posts
async function displayPosts(items) {
    if (!items || items.length === 0) {
        displayEmptyState();
        return;
    }
    
    postsContainer.innerHTML = '';
    
    for (const item of items) {
        let element;
        
        if (item.isAd) {
            // This is an ad
            element = createAdCard(item);
        } else {
            // This is a post
            element = await createPostElement(item);
        }
        
        postsContainer.appendChild(element);
    }
}

// Display Empty State
function displayEmptyState() {
    postsContainer.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 60px 20px; color: #657786;">
            <div style="font-size: 64px; margin-bottom: 16px;">📝</div>
            <div style="font-size: 18px; font-weight: 500; margin-bottom: 8px;">No posts yet</div>
            <div style="font-size: 14px; color: #8a8d91;">Be the first to post!</div>
        </div>
    `;
}

// Create Post Element
async function createPostElement(post) {
    const postCard = document.createElement('div');
    postCard.className = 'post-card';
    postCard.dataset.postId = post.id;
    postCard.dataset.authorId = post.authorId;
    
    const authorInitials = getInitials(post.authorName);
    const timeAgo = post.createdAt ? formatTimeAgo(post.createdAt) : 'Just now';
    
    // Check if current user liked this post
    let likedClass = '';
    if (currentUser) {
        const likeStatus = await hasUserLiked(post.id, currentUser.uid);
        likedClass = likeStatus.liked ? 'liked' : '';
    }
    
    // Link preview HTML
    let linkHtml = '';
    if (post.link) {
        linkHtml = `
            <div style="border: 1px solid #e1e8ed; border-radius: 8px; overflow: hidden; margin-top: 12px; cursor: pointer;" onclick="window.open('${post.link.url}', '_blank')">
                <img src="${post.link.image}" alt="" style="width: 100%; height: 200px; object-fit: cover; background: #f7f9fa;">
                <div style="padding: 12px;">
                    <div style="font-weight: 600; font-size: 15px; color: #14171a; margin-bottom: 4px;">${post.link.title}</div>
                    <div style="font-size: 13px; color: #657786; margin-bottom: 6px;">${post.link.description}</div>
                    <div style="font-size: 12px; color: #8a8d91;">${post.link.domain}</div>
                </div>
            </div>
        `;
    }
    
    postCard.innerHTML = `
        <div class="post-header">
            <div class="post-avatar" style="background: #1da1f2; color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 18px;">${authorInitials}</div>
            <div class="post-body">
                <div class="post-author-row">
                    <span class="post-author">${post.authorName}</span>
                    <span class="post-time">· ${timeAgo}</span>
                    <button class="post-menu-btn" data-post-id="${post.id}">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="2"/>
                            <circle cx="12" cy="12" r="2"/>
                            <circle cx="12" cy="19" r="2"/>
                        </svg>
                    </button>
                    <div class="post-menu" data-menu-id="${post.id}">
                        <button class="post-menu-item block-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                            </svg>
                            <span>Block User</span>
                        </button>
                        <button class="post-menu-item danger report-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            <span>Report Post</span>
                        </button>
                    </div>
                </div>
                <div class="post-content">${escapeHtml(post.content)}</div>
                ${linkHtml}
                <div class="post-actions">
                    <button class="post-action-btn comment-btn" onclick="window.location.href='post.html?id=${post.id}'">
                        <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span>${post.comments || 0}</span>
                    </button>
                    <button class="post-action-btn like-btn ${likedClass}" data-post-id="${post.id}">
                        <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                        <span class="like-count">${post.likes || 0}</span>
                    </button>
                    <button class="post-action-btn share-btn">
                        <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                            <polyline points="16 6 12 2 8 6"></polyline>
                            <line x1="12" y1="2" x2="12" y2="15"></line>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Menu button event
    const menuBtn = postCard.querySelector('.post-menu-btn');
    const menu = postCard.querySelector('.post-menu');
    
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllMenus();
        menu.classList.toggle('show');
    });
    
    // Block button event
    const blockBtn = postCard.querySelector('.block-btn');
    blockBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleBlockUser(post.authorId, post.authorName);
        menu.classList.remove('show');
    });
    
    // Report button event
    const reportBtn = postCard.querySelector('.report-btn');
    reportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleReportPost(post.id, post.authorName);
        menu.classList.remove('show');
    });
    
    // Like button event
    const likeBtn = postCard.querySelector('.like-btn');
    likeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await handleLike(post.id, likeBtn);
    });
    
    return postCard;
}

// Handle Block User
async function handleBlockUser(authorId, authorName) {
    if (!currentUser) {
        showError('Please login to block users');
        return;
    }
    
    if (authorId === currentUser.uid) {
        showError('You cannot block yourself');
        return;
    }
    
    const confirmed = confirm(`Are you sure you want to block ${authorName}?`);
    
    if (confirmed) {
        // TODO: Implement block functionality in database
        // For now, just show confirmation
        alert(`User ${authorName} has been blocked. (Feature in development)`);
        console.log('Block user:', authorId);
    }
}

// Handle Report Post
async function handleReportPost(postId, authorName) {
    if (!currentUser) {
        showError('Please login to report posts');
        return;
    }
    
    const confirmed = confirm(`Report this post by ${authorName}?`);
    
    if (confirmed) {
        // TODO: Implement report functionality in database
        // For now, just show confirmation
        alert('Post has been reported. Our team will review it. (Feature in development)');
        console.log('Report post:', postId);
    }
}

// Handle Like
async function handleLike(postId, btnElement) {
    if (!currentUser) {
        showError('Please login to like posts');
        return;
    }
    
    btnElement.disabled = true;
    
    const result = await togglePostLike(postId, currentUser.uid);
    
    if (result.success) {
        const likeCountSpan = btnElement.querySelector('.like-count');
        likeCountSpan.textContent = result.newLikes;
        
        if (result.liked) {
            btnElement.classList.add('liked');
        } else {
            btnElement.classList.remove('liked');
        }
    } else {
        showError('Failed to like post');
    }
    
    btnElement.disabled = false;
}

// HTML Escape (XSS Prevention)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Page unload cleanup
window.addEventListener('beforeunload', () => {
    if (postsUnsubscribe) {
        postsUnsubscribe();
    }
});