import { auth, database } from './firebase-config.js';
import { onAuthStateChanged, updateProfile } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { ref, get, update, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { formatTimeAgo, getInitials } from './utils.js';
import { getUserPosts } from './database.js';
import { getPostLikes } from './like.js';

// Global State
let currentUser = null;
let userProfile = null;
let currentTab = 'posts';

// DOM Elements
const loadingIndicator = document.getElementById('loadingIndicator');
const profileHeader = document.getElementById('profileHeader');
const tabs = document.getElementById('tabs');
const profileAvatar = document.getElementById('profileAvatar');
const profileName = document.getElementById('profileName');
const profileUsername = document.getElementById('profileUsername');
const profileBio = document.getElementById('profileBio');
const profileJoined = document.getElementById('profileJoined');
const postCount = document.getElementById('postCount');
const likeCount = document.getElementById('likeCount');
const postsContainer = document.getElementById('postsContainer');
const editProfileBtn = document.getElementById('editProfileBtn');
const editModal = document.getElementById('editModal');
const closeModalBtn = document.getElementById('closeModal');
const editForm = document.getElementById('editForm');
const editName = document.getElementById('editName');
const editBio = document.getElementById('editBio');
const bioCharCount = document.getElementById('bioCharCount');
const saveBtn = document.getElementById('saveBtn');

// Auth Check
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await loadProfile(user.uid);
    } else {
        window.location.href = 'index.html';
    }
});

// Load User Profile
async function loadProfile(userId) {
    try {
        loadingIndicator.style.display = 'block';

        // Get user data
        const userRef = ref(database, `users/${userId}`);
        const userSnapshot = await get(userRef);

        if (userSnapshot.exists()) {
            userProfile = userSnapshot.val();
        } else {
            // Create basic profile if doesn't exist
            userProfile = {
                uid: userId,
                email: currentUser.email,
                displayName: currentUser.displayName || currentUser.email.split('@')[0],
                createdAt: Date.now(),
                bio: ''
            };
            await set(userRef, userProfile);
        }

        // Get user stats
        const stats = await getUserStats(userId);

        // Display profile
        displayProfile(userProfile, stats);

        // Load posts
        loadUserPosts(userId);

        loadingIndicator.style.display = 'none';
        profileHeader.style.display = 'block';
        tabs.style.display = 'flex';

    } catch (error) {
        console.error('Error loading profile:', error);
        showError('Failed to load profile');
        loadingIndicator.style.display = 'none';
    }
}

// Display Profile
function displayProfile(profile, stats) {
    const initials = getInitials(profile.displayName);
    profileAvatar.textContent = initials;
    profileName.textContent = profile.displayName;
    profileUsername.textContent = '@' + profile.displayName.toLowerCase().replace(/\s+/g, '');
    
    if (profile.bio) {
        profileBio.textContent = profile.bio;
        profileBio.style.display = 'block';
    } else {
        profileBio.style.display = 'none';
    }

    // Format joined date
    const joinedDate = new Date(profile.createdAt);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    profileJoined.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        Joined ${months[joinedDate.getMonth()]} ${joinedDate.getFullYear()}
    `;

    // Display stats
    postCount.textContent = stats.posts;
    likeCount.textContent = stats.likes;
}

// Get User Stats
async function getUserStats(userId) {
    try {
        // Get user posts
        const postsResult = await getUserPosts(userId, 1000);
        const posts = postsResult.posts || [];

        // Count total likes received
        let totalLikes = 0;
        posts.forEach(post => {
            totalLikes += post.likes || 0;
        });

        return {
            posts: posts.length,
            likes: totalLikes
        };
    } catch (error) {
        console.error('Error getting stats:', error);
        return { posts: 0, likes: 0 };
    }
}

// Load User Posts
async function loadUserPosts(userId) {
    try {
        const result = await getUserPosts(userId, 50);
        
        if (result.success && result.posts.length > 0) {
            displayPosts(result.posts);
        } else {
            displayEmptyState();
        }
    } catch (error) {
        console.error('Error loading posts:', error);
        showError('Failed to load posts');
    }
}

// Display Posts
function displayPosts(posts) {
    postsContainer.innerHTML = '';

    posts.forEach(post => {
        const postCard = createPostCard(post);
        postsContainer.appendChild(postCard);
    });
}

// Create Post Card
function createPostCard(post) {
    const div = document.createElement('div');
    div.className = 'post-card';
    
    const initials = getInitials(post.authorName);
    const timeAgo = formatTimeAgo(post.createdAt);

    let linkHtml = '';
    if (post.link) {
        linkHtml = `
            <div style="border: 1px solid #e1e8ed; border-radius: 8px; overflow: hidden; margin-top: 12px; cursor: pointer;" onclick="window.open('${post.link.url}', '_blank'); event.stopPropagation();">
                <img src="${post.link.image}" alt="" style="width: 100%; height: 200px; object-fit: cover; background: #f7f9fa;">
                <div style="padding: 12px;">
                    <div style="font-weight: 600; font-size: 15px; color: #14171a; margin-bottom: 4px;">${escapeHtml(post.link.title)}</div>
                    <div style="font-size: 13px; color: #657786; line-height: 1.3; margin-bottom: 6px;">${escapeHtml(post.link.description)}</div>
                    <div style="font-size: 12px; color: #8a8d91;">${escapeHtml(post.link.domain)}</div>
                </div>
            </div>
        `;
    }

    div.innerHTML = `
        <div style="display: flex; gap: 12px;" onclick="window.location.href='post.html?id=${post.id}'">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: #1da1f2; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; flex-shrink: 0;">${initials}</div>
            <div style="flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                    <span style="font-weight: 700; color: #14171a; font-size: 15px;">${escapeHtml(post.authorName)}</span>
                    <span style="color: #657786; font-size: 15px;">@${post.authorName.toLowerCase().replace(/\s+/g, '')}</span>
                    <span style="color: #657786; font-size: 15px;">· ${timeAgo}</span>
                </div>
                <div style="color: #14171a; font-size: 15px; line-height: 20px; white-space: pre-wrap; word-wrap: break-word; margin-bottom: 12px;">${escapeHtml(post.content)}</div>
                ${linkHtml}
                <div style="display: flex; justify-content: space-between; max-width: 425px; margin-top: 12px;">
                    <button onclick="event.stopPropagation();" style="display: flex; align-items: center; gap: 8px; padding: 0; border: none; background: none; color: #657786; font-size: 13px; cursor: pointer;">
                        <svg style="width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span>${post.comments || 0}</span>
                    </button>
                    <button onclick="event.stopPropagation();" style="display: flex; align-items: center; gap: 8px; padding: 0; border: none; background: none; color: #657786; font-size: 13px; cursor: pointer;">
                        <svg style="width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                        <span>${post.likes || 0}</span>
                    </button>
                    <button onclick="event.stopPropagation();" style="display: flex; align-items: center; gap: 8px; padding: 0; border: none; background: none; color: #657786; font-size: 13px; cursor: pointer;">
                        <svg style="width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                            <polyline points="16 6 12 2 8 6"></polyline>
                            <line x1="12" y1="2" x2="12" y2="15"></line>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;

    return div;
}

// Display Empty State
function displayEmptyState() {
    postsContainer.innerHTML = `
        <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <div class="empty-state-text">No posts yet</div>
            <div class="empty-state-subtext">Start sharing your thoughts!</div>
        </div>
    `;
}

// Tab Switching
const tabBtns = document.querySelectorAll('.tab-btn');
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        currentTab = btn.dataset.tab;
        
        if (currentTab === 'posts') {
            loadUserPosts(currentUser.uid);
        } else if (currentTab === 'liked') {
            loadLikedPosts();
        }
    });
});

// Load Liked Posts
async function loadLikedPosts() {
    try {
        const likesRef = ref(database, 'likes');
        const likesSnapshot = await get(likesRef);

        if (!likesSnapshot.exists()) {
            postsContainer.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    <div class="empty-state-text">No likes yet</div>
                    <div class="empty-state-subtext">Like posts to see them here</div>
                </div>
            `;
            return;
        }

        const likedPostIds = [];
        const allLikes = likesSnapshot.val();

        // Find posts liked by current user
        Object.keys(allLikes).forEach(postId => {
            const postLikes = allLikes[postId];
            if (postLikes[currentUser.uid]) {
                likedPostIds.push(postId);
            }
        });

        if (likedPostIds.length === 0) {
            postsContainer.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    <div class="empty-state-text">No likes yet</div>
                    <div class="empty-state-subtext">Like posts to see them here</div>
                </div>
            `;
            return;
        }

        // Get posts data
        const posts = [];
        for (const postId of likedPostIds) {
            const postRef = ref(database, `posts/${postId}`);
            const postSnapshot = await get(postRef);
            if (postSnapshot.exists()) {
                posts.push({ id: postId, ...postSnapshot.val() });
            }
        }

        // Sort by created date
        posts.sort((a, b) => b.createdAt - a.createdAt);
        displayPosts(posts);

    } catch (error) {
        console.error('Error loading liked posts:', error);
        showError('Failed to load liked posts');
    }
}

// Bio character count
editBio.addEventListener('input', () => {
    bioCharCount.textContent = editBio.value.length;
});

// Edit Profile Button
editProfileBtn.addEventListener('click', () => {
    editName.value = userProfile.displayName;
    editBio.value = userProfile.bio || '';
    bioCharCount.textContent = editBio.value.length;
    editModal.classList.add('show');
});

// Close Modal
closeModalBtn.addEventListener('click', () => {
    editModal.classList.remove('show');
});

editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
        editModal.classList.remove('show');
    }
});

// Edit Form Submit
editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newName = editName.value.trim();
    const newBio = editBio.value.trim();

    if (!newName) {
        showError('Name is required');
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        // Update Firebase Auth profile
        await updateProfile(currentUser, {
            displayName: newName
        });

        // Update database
        const userRef = ref(database, `users/${currentUser.uid}`);
        await update(userRef, {
            displayName: newName,
            bio: newBio
        });

        // Update local profile
        userProfile.displayName = newName;
        userProfile.bio = newBio;

        // Update UI
        profileName.textContent = newName;
        profileUsername.textContent = '@' + newName.toLowerCase().replace(/\s+/g, '');
        profileAvatar.textContent = getInitials(newName);
        
        if (newBio) {
            profileBio.textContent = newBio;
            profileBio.style.display = 'block';
        } else {
            profileBio.style.display = 'none';
        }

        editModal.classList.remove('show');
        showSuccess('Profile updated successfully!');

    } catch (error) {
        console.error('Error updating profile:', error);
        showError('Failed to update profile');
    }

    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
});

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    setTimeout(() => errorDiv.classList.remove('show'), 5000);
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.classList.add('show');
    setTimeout(() => successDiv.classList.remove('show'), 3000);
}