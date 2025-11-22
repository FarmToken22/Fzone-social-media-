import { auth, database } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    updateProfile,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    ref, 
    set, 
    get,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Google Provider
const googleProvider = new GoogleAuthProvider();

// Error মেসেজ দেখানোর ফাংশন
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.add('show');
        setTimeout(() => {
            errorDiv.classList.remove('show');
        }, 5000);
    }
}

// Success মেসেজ দেখানোর ফাংশন
function showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.classList.add('show');
        setTimeout(() => {
            successDiv.classList.remove('show');
        }, 3000);
    }
}

// Firebase Error কে বাংলায় রূপান্তর
function getErrorMessage(errorCode) {
    const errors = {
        'auth/email-already-in-use': 'এই ইমেইল ইতিমধ্যে ব্যবহৃত হয়েছে',
        'auth/invalid-email': 'ইমেইল ঠিকানা সঠিক নয়',
        'auth/weak-password': 'পাসওয়ার্ড খুব দুর্বল (কমপক্ষে ৬টি অক্ষর দিন)',
        'auth/user-not-found': 'এই ইমেইলে কোনো অ্যাকাউন্ট নেই',
        'auth/wrong-password': 'পাসওয়ার্ড ভুল হয়েছে',
        'auth/too-many-requests': 'অনেকবার চেষ্টা করেছেন। একটু পরে চেষ্টা করুন',
        'auth/network-request-failed': 'ইন্টারনেট সংযোগ নেই',
        'auth/popup-closed-by-user': 'আপনি পপআপ বন্ধ করে দিয়েছেন'
    };
    return errors[errorCode] || 'কিছু ভুল হয়েছে। আবার চেষ্টা করুন';
}

// Loading স্টেট টগল
function toggleLoading(button, isLoading) {
    const btnText = button.querySelector('.btn-text');
    const spinner = button.querySelector('.loading-spinner');
    
    if (isLoading) {
        button.disabled = true;
        btnText.style.display = 'none';
        spinner.style.display = 'inline-block';
    } else {
        button.disabled = false;
        btnText.style.display = 'inline';
        spinner.style.display = 'none';
    }
}

// ইউজার ডাটা Realtime Database এ সেভ করা
async function saveUserData(user, displayName) {
    try {
        const userRef = ref(database, 'users/' + user.uid);
        await set(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: displayName || user.displayName || 'User',
            createdAt: Date.now(),
            lastLogin: Date.now()
        });
    } catch (error) {
        console.error('Error saving user data:', error);
    }
}

// সাইনআপ ফাংশন
async function signUp(email, password, name) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // ইউজার প্রোফাইল আপডেট
        await updateProfile(user, {
            displayName: name
        });
        
        // Realtime Database এ ডাটা সেভ
        await saveUserData(user, name);
        
        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.code };
    }
}

// লগইন ফাংশন
async function login(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: error.code };
    }
}

// Google দিয়ে সাইন ইন
async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        // চেক করুন ইউজার নতুন কিনা
        const userRef = ref(database, 'users/' + user.uid);
        const snapshot = await get(userRef);
        
        if (!snapshot.exists()) {
            await saveUserData(user, user.displayName);
        }
        
        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.code };
    }
}

// Auth State পরিবর্তন শুনুন
onAuthStateChanged(auth, (user) => {
    if (user) {
        // ইউজার লগড ইন আছে
        console.log('User logged in:', user.email);
    } else {
        // ইউজার লগড আউট
        console.log('User logged out');
    }
});

// পেজ লোড হলে Event Listeners যোগ করুন
document.addEventListener('DOMContentLoaded', () => {
    
    // লগইন ফর্ম
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const loginBtn = document.getElementById('loginBtn');
            
            toggleLoading(loginBtn, true);
            
            const result = await login(email, password);
            
            toggleLoading(loginBtn, false);
            
            if (result.success) {
                showSuccess('সফলভাবে লগইন হয়েছে!');
                // Feed পেজে রিডাইরেক্ট
                setTimeout(() => {
                    window.location.href = 'feed.html';
                }, 500);
            } else {
                showError(getErrorMessage(result.error));
            }
        });
    }
    
    // সাইনআপ ফর্ম
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const signupBtn = document.getElementById('signupBtn');
            
            // পাসওয়ার্ড মিলছে কিনা চেক করুন
            if (password !== confirmPassword) {
                showError('পাসওয়ার্ড মিলছে না');
                return;
            }
            
            toggleLoading(signupBtn, true);
            
            const result = await signUp(email, password, name);
            
            toggleLoading(signupBtn, false);
            
            if (result.success) {
                showSuccess('অ্যাকাউন্ট তৈরি হয়েছে! লগইন পেজে যাচ্ছে...');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                showError(getErrorMessage(result.error));
            }
        });
    }
    
    // Google লগইন/সাইনআপ বাটন
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            const result = await signInWithGoogle();
            
            if (result.success) {
                showSuccess('Google দিয়ে সফলভাবে লগইন হয়েছে!');
                // Feed পেজে রিডাইরেক্ট
                setTimeout(() => {
                    window.location.href = 'feed.html';
                }, 500);
            } else {
                showError(getErrorMessage(result.error));
            }
        });
    }
    
    const googleSignupBtn = document.getElementById('googleSignupBtn');
    if (googleSignupBtn) {
        googleSignupBtn.addEventListener('click', async () => {
            const result = await signInWithGoogle();
            
            if (result.success) {
                showSuccess('Google দিয়ে সফলভাবে সাইন আপ হয়েছে!');
                // Feed পেজে রিডাইরেক্ট
                setTimeout(() => {
                    window.location.href = 'feed.html';
                }, 500);
            } else {
                showError(getErrorMessage(result.error));
            }
        });
    }
});