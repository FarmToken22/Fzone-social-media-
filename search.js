import { auth, database } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { ref, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { formatTimeAgo, getInitials, debounce } from './utils.js';

// Global State
let currentUser = null;
let allPosts = [];
let allUsers = [];
let currentFilter = 'all';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const clearBtn = document.getElementById('clearBtn');
const filters = document.getElementById('filters');
const resultsHeader = document.getElementById('resultsHeader');
const resultsCount = document.getElementById('resultsCount');
const resultsSubtext = document.getElementById('resultsSubtext');
const initialState = document.getElementById('initialState');
const loadingIndicator = document.getElementById('loadingIndicator');
const resultsContainer = document.getElementById('resultsContainer');

// Auth Check
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadData();
    } else {
        window.location.href = 'index.html';
    }
});

// Load All Data
async function loadData() {
    try {
        // Load all posts
        const postsRef = ref(database, 'posts');
        const postsSnapshot = await get(postsRef);
        
        if (postsSnapshot.exists()) {
            const postsData = postsSnapshot.val();
            allPosts = Object.keys(postsData).map(key => ({
                id: key,
                ...postsData[key]
            }));
        }

        // Load all users
        const usersRef = ref(database, 'users');
        const usersSnapshot = await get(usersRef);
        
        if (usersSnapshot.exists()) {
            const usersData = usersSnapshot.val();
            allUsers = Object.keys(usersData).map(key => ({
                id: key,
                ...usersData[key]
            }));
        }

    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Search Input Event
searchInput.addEventListener('input', debounce((e) => {
    const query = e.target.value.trim();
    
    if (query.length > 0) {
        clearBtn.classList.add('show');
        filters.style.display = 'flex';
        initialState.style.display = 'none';
        performSearch(query);
    } else {
        clearBtn.classList.remove('show');
        filters.style.display = 'none';
        resultsHeader.style.display = 'none';
        resultsContainer.innerHTML = '';
        initialState.style.display = 'block';
    }
}, 300));

// Clear Button
clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.classList.remove('show');
    filters.style.display = 'none';
    resultsHeader.style.display = 'none';
    resultsContainer.innerHTML = '';
    initialState.style.display = 'block';
    searchInput.focus();
});

// Filter Buttons
const filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        
        const query = searchInput.value.trim();
        if (query) {
            performSearch(query);
        }
    });
});

// Perform Search
function performSearch(query) {
    loadingIndicator.style.display = 'block';
    resultsContainer.innerHTML = '';

    setTimeout(() => {
        const results = searchData(query, currentFilter);
        displayResults(results, query);
        loadingIndicator.style.display = 'none';
    }, 300);
}

// Search Data
function searchData(query, filter) {
    const queryLower = query.toLowerCase();
    const results = {
        posts: [],
        users: []
    };

    // Search Posts
    if (filter === 'all' || filter === 'posts') {
        results.posts = allPosts.filter(post => {
            const contentMatch = post.content.toLowerCase().includes(queryLower);
            const authorMatch = post.authorName.toLowerCase().includes(queryLower);
            const linkMatch = post.link && (
                post.link.title.toLowerCase().includes(queryLower) ||
                post.link.url.toLowerCase().includes(queryLower)
            );

            return contentMatch || authorMatch || linkMatch;
        });

        // Sort by relevance (exact matches first)
        results.posts.sort((a, b) => {
            const aExact = a.content.toLowerCase().includes(queryLower) ? 1 : 0;
            const bExact = b.content.toLowerCase().includes(queryLower) ? 1 : 0;
            return bExact - aExact || b.createdAt - a.createdAt;
        });
    }

    // Search Users
    if (filter === 'all' || filter === 'users') {
        results.users = allUsers.filter(user => {
            const nameMatch = user.displayName.toLowerCase().includes(queryLower);
            const emailMatch = user.email.toLowerCase().includes(queryLower);
            const bioMatch = user.bio && user.bio.toLowerCase().includes(queryLower);

            return nameMatch || emailMatch || bioMatch;
        });
    }

    return results;
}

// Display Results
function displayResults(results, query) {
    const totalResults = results.posts.length + results.users.length;

    if (totalResults === 0) {
        displayEmptyState(query);
        resultsHeader.style.display = 'none';
        return;
    }

    // Update header
    resultsHeader.style.display = 'block';
    resultsCount.textContent = `${totalResults} result${totalResults !== 1 ? 's' : ''}`;
    resultsSubtext.textContent = `for "${query}"`;

    // Display results
    resultsContainer.innerHTML = '';

    // Display users first
    if (results.users.length > 0) {
        results.users.forEach(user => {
            const userCard = createUserCard(user, query);
            resultsContainer.appendChild(userCard);
        });
    }

    // Display posts
    if (results.posts.length > 0) {
        results.posts.forEach(post => {
            const postCard = createPostCard(post, query);
            resultsContainer.appendChild(postCard);
        });
    }
}

// Create User Card
function createUserCard(user, query) {
    const div = document.createElement('div');
    div.className = 'result-card';
    div.onclick = () => {
        if (user.uid === currentUser.uid) {
            window.location.href = 'profile.html';
        } else {
            alert('User profile feature coming soon!');
        }
    };

    const initials = getInitials(user.displayName);
    const highlightedName = highlightText(user.displayName, query);
    const bio = user.bio || 'No bio';

    div.innerHTML = `
        <div class="result-header">
            <div class="result-avatar">${initials}</div>
            <div class="result-body">
                <div class="result-author-row">
                    <span class="result-author">${highlightedName}</span>
                    <span class="result-username">@${user.displayName.toLowerCase().replace(/\s+/g, '')}</span>
                </div>
                <div class="result-content">${escapeHtml(bio)}</div>
            </div>
        </div>
    `;

    return div;
}

// Create Post Card
function createPostCard(post, query) {
    const div = document.createElement('div');
    div.className = 'result-card';
    div.onclick = () => window.location.href = `post.html?id=${post.id}`;

    const initials = getInitials(post.authorName);
    const timeAgo = formatTimeAgo(post.createdAt);
    const highlightedContent = highlightText(post.content, query);

    div.innerHTML = `
        <div class="result-header">
            <div class="result-avatar">${initials}</div>
            <div class="result-body">
                <div class="result-author-row">
                    <span class="result-author">${escapeHtml(post.authorName)}</span>
                    <span class="result-username">@${post.authorName.toLowerCase().replace(/\s+/g, '')}</span>
                    <span class="result-time">· ${timeAgo}</span>
                </div>
                <div class="result-content">${highlightedContent}</div>
                <div class="result-stats">
                    <span>
                        <svg style="width: 14px; height: 14px; display: inline-block; vertical-align: middle; stroke: currentColor; fill: none;" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        ${post.comments || 0}
                    </span>
                    <span>
                        <svg style="width: 14px; height: 14px; display: inline-block; vertical-align: middle; stroke: currentColor; fill: none;" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                        ${post.likes || 0}
                    </span>
                </div>
            </div>
        </div>
    `;

    return div;
}

// Highlight matching text
function highlightText(text, query) {
    if (!query) return escapeHtml(text);

    const escapedText = escapeHtml(text);
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    
    return escapedText.replace(regex, '<span class="highlight">$1</span>');
}

// Escape regex special characters
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Display Empty State
function displayEmptyState(query) {
    resultsContainer.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
            </div>
            <div class="empty-text">No results found</div>
            <div class="empty-subtext">Try searching for something else</div>
        </div>
    `;
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Auto-focus search input
searchInput.focus();