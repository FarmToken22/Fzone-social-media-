import { database } from './firebase-config.js';
import { ref, get, set, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Like System - Each user can like once

// Toggle post like/unlike
export async function togglePostLike(postId, userId) {
    try {
        // Check if user already liked
        const likeRef = ref(database, `likes/${postId}/${userId}`);
        const likeSnapshot = await get(likeRef);
        
        const postRef = ref(database, `posts/${postId}`);
        const postSnapshot = await get(postRef);
        
        if (!postSnapshot.exists()) {
            return {
                success: false,
                error: 'Post not found'
            };
        }
        
        const currentLikes = postSnapshot.val().likes || 0;
        
        if (likeSnapshot.exists()) {
            // Already liked - Remove like (Unlike)
            await set(likeRef, null); // Delete like
            await update(postRef, {
                likes: Math.max(0, currentLikes - 1)
            });
            
            return {
                success: true,
                liked: false,
                newLikes: Math.max(0, currentLikes - 1)
            };
        } else {
            // Not liked yet - Add like
            await set(likeRef, {
                userId: userId,
                timestamp: Date.now()
            });
            
            await update(postRef, {
                likes: currentLikes + 1
            });
            
            return {
                success: true,
                liked: true,
                newLikes: currentLikes + 1
            };
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        return {
            success: false,
            error: 'Failed to like post'
        };
    }
}

// Check if user liked a post
export async function hasUserLiked(postId, userId) {
    try {
        const likeRef = ref(database, `likes/${postId}/${userId}`);
        const snapshot = await get(likeRef);
        
        return {
            success: true,
            liked: snapshot.exists()
        };
    } catch (error) {
        console.error('Error checking like:', error);
        return {
            success: false,
            liked: false
        };
    }
}

// Get all users who liked a post
export async function getPostLikes(postId) {
    try {
        const likesRef = ref(database, `likes/${postId}`);
        const snapshot = await get(likesRef);
        
        if (!snapshot.exists()) {
            return {
                success: true,
                likes: [],
                count: 0
            };
        }
        
        const likesData = snapshot.val();
        const likes = Object.keys(likesData).map(userId => ({
            userId: userId,
            timestamp: likesData[userId].timestamp
        }));
        
        return {
            success: true,
            likes: likes,
            count: likes.length
        };
    } catch (error) {
        console.error('Error getting likes:', error);
        return {
            success: false,
            likes: [],
            count: 0
        };
    }
}

// Toggle comment like/unlike
export async function toggleCommentLike(postId, commentId, userId) {
    try {
        const likeRef = ref(database, `commentLikes/${postId}/${commentId}/${userId}`);
        const likeSnapshot = await get(likeRef);
        
        const commentRef = ref(database, `comments/${postId}/${commentId}`);
        const commentSnapshot = await get(commentRef);
        
        if (!commentSnapshot.exists()) {
            return {
                success: false,
                error: 'Comment not found'
            };
        }
        
        const currentLikes = commentSnapshot.val().likes || 0;
        
        if (likeSnapshot.exists()) {
            // Unlike
            await set(likeRef, null);
            await update(commentRef, {
                likes: Math.max(0, currentLikes - 1)
            });
            
            return {
                success: true,
                liked: false,
                newLikes: Math.max(0, currentLikes - 1)
            };
        } else {
            // Like
            await set(likeRef, {
                userId: userId,
                timestamp: Date.now()
            });
            
            await update(commentRef, {
                likes: currentLikes + 1
            });
            
            return {
                success: true,
                liked: true,
                newLikes: currentLikes + 1
            };
        }
    } catch (error) {
        console.error('Error toggling comment like:', error);
        return {
            success: false,
            error: 'Failed to like comment'
        };
    }
}

// Check if user liked a comment
export async function hasUserLikedComment(postId, commentId, userId) {
    try {
        const likeRef = ref(database, `commentLikes/${postId}/${commentId}/${userId}`);
        const snapshot = await get(likeRef);
        
        return {
            success: true,
            liked: snapshot.exists()
        };
    } catch (error) {
        console.error('Error checking comment like:', error);
        return {
            success: false,
            liked: false
        };
    }
}

// Get total likes count for a post (fast method)
export async function getPostLikesCount(postId) {
    try {
        const postRef = ref(database, `posts/${postId}`);
        const snapshot = await get(postRef);
        
        if (!snapshot.exists()) {
            return { success: true, count: 0 };
        }
        
        return {
            success: true,
            count: snapshot.val().likes || 0
        };
    } catch (error) {
        console.error('Error getting likes count:', error);
        return { success: false, count: 0 };
    }
}

// Batch check multiple posts for like status
export async function checkMultiplePostLikes(postIds, userId) {
    try {
        const results = {};
        
        for (const postId of postIds) {
            const result = await hasUserLiked(postId, userId);
            results[postId] = result.liked;
        }
        
        return {
            success: true,
            results: results
        };
    } catch (error) {
        console.error('Error checking multiple likes:', error);
        return {
            success: false,
            results: {}
        };
    }
}