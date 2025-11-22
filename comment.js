import { database } from './firebase-config.js';
import { ref, push, set, get, update, remove, onValue, off } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Comment System - With nested comment support

// Create new comment
export async function createComment(postId, commentData) {
    try {
        // Create comment
        const commentsRef = ref(database, `comments/${postId}`);
        const newCommentRef = push(commentsRef);
        
        const comment = {
            content: commentData.content,
            authorId: commentData.authorId,
            authorName: commentData.authorName,
            authorEmail: commentData.authorEmail,
            createdAt: Date.now(),
            likes: 0,
            replies: 0
        };
        
        await set(newCommentRef, comment);
        
        // Update post comment count
        const postRef = ref(database, `posts/${postId}`);
        const postSnapshot = await get(postRef);
        
        if (postSnapshot.exists()) {
            const currentComments = postSnapshot.val().comments || 0;
            await update(postRef, {
                comments: currentComments + 1
            });
        }
        
        return {
            success: true,
            commentId: newCommentRef.key,
            message: 'Comment added successfully'
        };
    } catch (error) {
        console.error('Error creating comment:', error);
        return {
            success: false,
            error: 'Failed to post comment'
        };
    }
}

// Load all comments for a post
export async function getPostComments(postId) {
    try {
        const commentsRef = ref(database, `comments/${postId}`);
        const snapshot = await get(commentsRef);
        
        if (!snapshot.exists()) {
            return {
                success: true,
                comments: []
            };
        }
        
        const commentsData = snapshot.val();
        const comments = [];
        
        Object.keys(commentsData).forEach(key => {
            comments.push({
                id: key,
                ...commentsData[key]
            });
        });
        
        // Sort by timestamp (newest first)
        comments.sort((a, b) => b.createdAt - a.createdAt);
        
        return {
            success: true,
            comments: comments
        };
    } catch (error) {
        console.error('Error getting comments:', error);
        return {
            success: false,
            comments: [],
            error: 'Failed to load comments'
        };
    }
}

// Real-time comment listener
export function listenToComments(postId, callback) {
    try {
        const commentsRef = ref(database, `comments/${postId}`);
        
        const listener = onValue(commentsRef, (snapshot) => {
            if (!snapshot.exists()) {
                callback({ success: true, comments: [] });
                return;
            }
            
            const commentsData = snapshot.val();
            const comments = [];
            
            Object.keys(commentsData).forEach(key => {
                comments.push({
                    id: key,
                    ...commentsData[key]
                });
            });
            
            // Sort by timestamp
            comments.sort((a, b) => b.createdAt - a.createdAt);
            
            callback({ success: true, comments: comments });
        }, (error) => {
            console.error('Error listening to comments:', error);
            callback({ success: false, error: error.message });
        });
        
        // Return unsubscribe function
        return () => off(commentsRef, 'value', listener);
    } catch (error) {
        console.error('Error setting up comment listener:', error);
        return null;
    }
}

// Update comment
export async function updateComment(postId, commentId, newContent) {
    try {
        const commentRef = ref(database, `comments/${postId}/${commentId}`);
        const snapshot = await get(commentRef);
        
        if (!snapshot.exists()) {
            return {
                success: false,
                error: 'Comment not found'
            };
        }
        
        await update(commentRef, {
            content: newContent,
            editedAt: Date.now(),
            edited: true
        });
        
        return {
            success: true,
            message: 'Comment updated successfully'
        };
    } catch (error) {
        console.error('Error updating comment:', error);
        return {
            success: false,
            error: 'Failed to update comment'
        };
    }
}

// Delete comment
export async function deleteComment(postId, commentId) {
    try {
        const commentRef = ref(database, `comments/${postId}/${commentId}`);
        await remove(commentRef);
        
        // Update post comment count
        const postRef = ref(database, `posts/${postId}`);
        const postSnapshot = await get(postRef);
        
        if (postSnapshot.exists()) {
            const currentComments = postSnapshot.val().comments || 0;
            await update(postRef, {
                comments: Math.max(0, currentComments - 1)
            });
        }
        
        return {
            success: true,
            message: 'Comment deleted successfully'
        };
    } catch (error) {
        console.error('Error deleting comment:', error);
        return {
            success: false,
            error: 'Failed to delete comment'
        };
    }
}

// Create reply (nested comment)
export async function createReply(postId, parentCommentId, replyData) {
    try {
        // Create reply
        const repliesRef = ref(database, `replies/${postId}/${parentCommentId}`);
        const newReplyRef = push(repliesRef);
        
        const reply = {
            content: replyData.content,
            authorId: replyData.authorId,
            authorName: replyData.authorName,
            authorEmail: replyData.authorEmail,
            createdAt: Date.now(),
            likes: 0
        };
        
        await set(newReplyRef, reply);
        
        // Update parent comment reply count
        const commentRef = ref(database, `comments/${postId}/${parentCommentId}`);
        const commentSnapshot = await get(commentRef);
        
        if (commentSnapshot.exists()) {
            const currentReplies = commentSnapshot.val().replies || 0;
            await update(commentRef, {
                replies: currentReplies + 1
            });
        }
        
        return {
            success: true,
            replyId: newReplyRef.key,
            message: 'Reply added successfully'
        };
    } catch (error) {
        console.error('Error creating reply:', error);
        return {
            success: false,
            error: 'Failed to post reply'
        };
    }
}

// Get replies for a comment
export async function getCommentReplies(postId, commentId) {
    try {
        const repliesRef = ref(database, `replies/${postId}/${commentId}`);
        const snapshot = await get(repliesRef);
        
        if (!snapshot.exists()) {
            return {
                success: true,
                replies: []
            };
        }
        
        const repliesData = snapshot.val();
        const replies = [];
        
        Object.keys(repliesData).forEach(key => {
            replies.push({
                id: key,
                ...repliesData[key]
            });
        });
        
        // Sort by timestamp
        replies.sort((a, b) => a.createdAt - b.createdAt);
        
        return {
            success: true,
            replies: replies
        };
    } catch (error) {
        console.error('Error getting replies:', error);
        return {
            success: false,
            replies: []
        };
    }
}

// Get comment count for a post
export async function getCommentCount(postId) {
    try {
        const postRef = ref(database, `posts/${postId}`);
        const snapshot = await get(postRef);
        
        if (!snapshot.exists()) {
            return { success: true, count: 0 };
        }
        
        return {
            success: true,
            count: snapshot.val().comments || 0
        };
    } catch (error) {
        console.error('Error getting comment count:', error);
        return { success: false, count: 0 };
    }
}