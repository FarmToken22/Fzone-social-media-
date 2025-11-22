import { auth, database } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { ref, push, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getInitials } from './utils.js';
import { extractLinkMetadata, updateLinkPreview, hideLinkPreview } from './upload.js';

// Global state
let currentUser = null;
let currentLinkMetadata = null;

// DOM Elements
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const postContent = document.getElementById('postContent');
const charCount = document.getElementById('charCount');
const linkInput = document.getElementById('linkInput');
const addLinkBtn = document.getElementById('addLinkBtn');
const removeLinkBtn = document.getElementById('removeLinkBtn');
const submitBtn = document.getElementById('submitBtn');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

// Auth State Check
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        updateUserUI(user);
    } else {
        window.location.href = 'index.html';
    }
});

// Update User UI
function updateUserUI(user) {
    const displayName = user.displayName || user.email.split('@')[0];
    const initials = getInitials(displayName);
    
    if (userAvatar) {
        userAvatar.textContent = initials;
    }
    if (userName) {
        userName.textContent = displayName;
    }
}

// Character Count Update
if (postContent) {
    postContent.addEventListener('input', () => {
        const length = postContent.value.length;
        charCount.textContent = `${length} / 5000`;
        
        if (length > 4500) {
            charCount.classList.add('warning');
        } else {
            charCount.classList.remove('warning');
        }
        
        // Enable/disable submit button
        updateSubmitButton();
    });
}

// Add Link Button
if (addLinkBtn) {
    addLinkBtn.addEventListener('click', async () => {
        const url = linkInput.value.trim();
        
        if (!url) {
            showError('Please enter a link URL');
            return;
        }
        
        addLinkBtn.disabled = true;
        addLinkBtn.textContent = '⏳ Loading...';
        
        const result = await extractLinkMetadata(url);
        
        addLinkBtn.disabled = false;
        addLinkBtn.textContent = '🔗 Add Link';
        
        if (result.success) {
            currentLinkMetadata = result.metadata;
            updateLinkPreview(result.metadata);
            linkInput.value = '';
            showSuccess('Link added successfully!');
        } else {
            showError(result.error);
        }
    });
}

// Remove Link Button
if (removeLinkBtn) {
    removeLinkBtn.addEventListener('click', () => {
        currentLinkMetadata = null;
        hideLinkPreview();
        linkInput.value = '';
    });
}

// Link Action Button (alternative way to add link)
const addLinkAction = document.getElementById('addLinkAction');
if (addLinkAction) {
    addLinkAction.addEventListener('click', () => {
        linkInput.focus();
    });
}

// Submit Post
if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
        await handleSubmitPost();
    });
}

// Handle Post Submission
async function handleSubmitPost() {
    const content = postContent.value.trim();
    
    // Validation
    if (!content) {
        showError('Please write something!');
        return;
    }
    
    if (!currentUser) {
        showError('You need to login');
        window.location.href = 'index.html';
        return;
    }
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    
    try {
        // Create post data
        const postData = {
            content: content,
            authorId: currentUser.uid,
            authorName: currentUser.displayName || currentUser.email.split('@')[0],
            authorEmail: currentUser.email,
            createdAt: Date.now(),
            likes: 0,
            comments: 0,
            shares: 0
        };
        
        // Add link if available
        if (currentLinkMetadata) {
            postData.link = {
                url: currentLinkMetadata.url,
                title: currentLinkMetadata.title,
                description: currentLinkMetadata.description,
                image: currentLinkMetadata.image,
                domain: currentLinkMetadata.domain
            };
        }
        
        // Save to database
        const postsRef = ref(database, 'posts');
        const newPostRef = push(postsRef);
        await set(newPostRef, postData);
        
        // Success
        showSuccess('Post created successfully!');
        
        // Redirect to feed after 1 second
        setTimeout(() => {
            window.location.href = 'feed.html';
        }, 1000);
        
    } catch (error) {
        console.error('Error creating post:', error);
        showError('Failed to create post');
        
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
    }
}

// Update Submit Button State
function updateSubmitButton() {
    const hasContent = postContent.value.trim().length > 0;
    submitBtn.disabled = !hasContent;
}

// Show Error Message
function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.classList.add('show');
        
        setTimeout(() => {
            errorMessage.classList.remove('show');
        }, 5000);
    }
}

// Show Success Message
function showSuccess(message) {
    if (successMessage) {
        successMessage.textContent = message;
        successMessage.classList.add('show');
        
        setTimeout(() => {
            successMessage.classList.remove('show');
        }, 3000);
    }
}

// Enter key shortcut (Ctrl+Enter to submit)
if (postContent) {
    postContent.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            handleSubmitPost();
        }
    });
}