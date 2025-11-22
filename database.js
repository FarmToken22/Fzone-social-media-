import { database } from './firebase-config.js';
import { 
    ref, 
    push,
    set,
    get,
    update,
    remove,
    query,
    orderByChild,
    limitToLast,
    onValue,
    off
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Posts Reference
const postsRef = ref(database, 'posts');

// নতুন পোস্ট তৈরি করা
export async function createPost(postData) {
    try {
        // নতুন পোস্ট রেফারেন্স তৈরি
        const newPostRef = push(postsRef);
        
        const post = {
            content: postData.content,
            authorId: postData.authorId,
            authorName: postData.authorName,
            authorEmail: postData.authorEmail,
            createdAt: Date.now(),
            likes: 0,
            comments: 0,
            shares: 0
        };
        
        await set(newPostRef, post);
        
        return {
            success: true,
            postId: newPostRef.key,
            message: 'পোস্ট সফলভাবে তৈরি হয়েছে'
        };
    } catch (error) {
        console.error('Error creating post:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// সব পোস্ট লোড করা (সর্বশেষ আগে)
export async function getAllPosts(limitCount = 50) {
    try {
        const snapshot = await get(postsRef);
        
        if (!snapshot.exists()) {
            return {
                success: true,
                posts: []
            };
        }
        
        const postsData = snapshot.val();
        const posts = [];
        
        // Object কে Array তে রূপান্তর করা
        Object.keys(postsData).forEach((key) => {
            posts.push({
                id: key,
                ...postsData[key]
            });
        });
        
        // সময় অনুযায়ী সাজানো (নতুন আগে)
        posts.sort((a, b) => b.createdAt - a.createdAt);
        
        // Limit প্রয়োগ করা
        const limitedPosts = posts.slice(0, limitCount);
        
        return {
            success: true,
            posts: limitedPosts
        };
    } catch (error) {
        console.error('Error fetching posts:', error);
        return {
            success: false,
            error: error.message,
            posts: []
        };
    }
}

// নির্দিষ্ট ইউজারের পোস্ট লোড করা
export async function getUserPosts(userId, limitCount = 20) {
    try {
        const snapshot = await get(postsRef);
        
        if (!snapshot.exists()) {
            return {
                success: true,
                posts: []
            };
        }
        
        const postsData = snapshot.val();
        const posts = [];
        
        // ফিল্টার করা: শুধু নির্দিষ্ট ইউজারের পোস্ট
        Object.keys(postsData).forEach((key) => {
            if (postsData[key].authorId === userId) {
                posts.push({
                    id: key,
                    ...postsData[key]
                });
            }
        });
        
        // সময় অনুযায়ী সাজানো
        posts.sort((a, b) => b.createdAt - a.createdAt);
        
        // Limit প্রয়োগ
        const limitedPosts = posts.slice(0, limitCount);
        
        return {
            success: true,
            posts: limitedPosts
        };
    } catch (error) {
        console.error('Error fetching user posts:', error);
        return {
            success: false,
            error: error.message,
            posts: []
        };
    }
}

// Real-time পোস্ট লিসেনার (লাইভ আপডেট)
export function listenToPosts(callback, limitCount = 50) {
    try {
        const postsListener = onValue(postsRef, (snapshot) => {
            if (!snapshot.exists()) {
                callback({ success: true, posts: [] });
                return;
            }
            
            const postsData = snapshot.val();
            const posts = [];
            
            Object.keys(postsData).forEach((key) => {
                posts.push({
                    id: key,
                    ...postsData[key]
                });
            });
            
            // সময় অনুযায়ী সাজানো
            posts.sort((a, b) => b.createdAt - a.createdAt);
            
            // Limit
            const limitedPosts = posts.slice(0, limitCount);
            
            callback({ success: true, posts: limitedPosts });
        }, (error) => {
            console.error('Error listening to posts:', error);
            callback({ success: false, error: error.message });
        });
        
        // Unsubscribe ফাংশন রিটার্ন করা
        return () => off(postsRef, 'value', postsListener);
    } catch (error) {
        console.error('Error setting up posts listener:', error);
        return null;
    }
}

// পোস্ট আপডেট করা
export async function updatePost(postId, updates) {
    try {
        const postRef = ref(database, `posts/${postId}`);
        await update(postRef, updates);
        
        return {
            success: true,
            message: 'পোস্ট আপডেট হয়েছে'
        };
    } catch (error) {
        console.error('Error updating post:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// পোস্ট মুছে ফেলা
export async function deletePost(postId) {
    try {
        const postRef = ref(database, `posts/${postId}`);
        await remove(postRef);
        
        return {
            success: true,
            message: 'পোস্ট মুছে ফেলা হয়েছে'
        };
    } catch (error) {
        console.error('Error deleting post:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// লাইক/আনলাইক পোস্ট
export async function toggleLike(postId, currentLikes) {
    try {
        const postRef = ref(database, `posts/${postId}`);
        const newLikes = currentLikes + 1;
        
        await update(postRef, {
            likes: newLikes
        });
        
        return {
            success: true,
            newLikes: newLikes
        };
    } catch (error) {
        console.error('Error toggling like:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// কমেন্ট কাউন্ট আপডেট
export async function updateCommentCount(postId, count) {
    try {
        const postRef = ref(database, `posts/${postId}`);
        await update(postRef, {
            comments: count
        });
        
        return { success: true };
    } catch (error) {
        console.error('Error updating comment count:', error);
        return { success: false, error: error.message };
    }
}

// শেয়ার কাউন্ট আপডেট
export async function updateShareCount(postId, currentShares) {
    try {
        const postRef = ref(database, `posts/${postId}`);
        const newShares = currentShares + 1;
        
        await update(postRef, {
            shares: newShares
        });
        
        return {
            success: true,
            newShares: newShares
        };
    } catch (error) {
        console.error('Error updating share count:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// সার্চ ফাংশন
export async function searchPosts(searchTerm) {
    try {
        const result = await getAllPosts(100);
        
        if (result.success) {
            const filteredPosts = result.posts.filter(post => 
                post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                post.authorName.toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            return {
                success: true,
                posts: filteredPosts
            };
        }
        
        return result;
    } catch (error) {
        console.error('Error searching posts:', error);
        return {
            success: false,
            error: error.message,
            posts: []
        };
    }
}

// পোস্ট স্ট্যাটস পাওয়া
export async function getPostStats() {
    try {
        const snapshot = await get(postsRef);
        
        if (!snapshot.exists()) {
            return {
                success: true,
                stats: {
                    totalPosts: 0,
                    totalLikes: 0,
                    totalComments: 0
                }
            };
        }
        
        const postsData = snapshot.val();
        let totalPosts = 0;
        let totalLikes = 0;
        let totalComments = 0;
        
        Object.keys(postsData).forEach((key) => {
            totalPosts++;
            totalLikes += postsData[key].likes || 0;
            totalComments += postsData[key].comments || 0;
        });
        
        return {
            success: true,
            stats: {
                totalPosts,
                totalLikes,
                totalComments
            }
        };
    } catch (error) {
        console.error('Error getting stats:', error);
        return {
            success: false,
            error: error.message
        };
    }
}