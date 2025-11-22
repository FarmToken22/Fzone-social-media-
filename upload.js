// Link preview and upload handling

// Extract metadata from URL (simple version)
export async function extractLinkMetadata(url) {
    try {
        // URL validation
        if (!isValidUrl(url)) {
            return {
                success: false,
                error: 'Please enter a valid URL'
            };
        }

        // Create simple metadata (without real API)
        const metadata = {
            url: url,
            title: extractTitleFromUrl(url),
            description: 'Check out this link',
            image: getDefaultImage(url),
            domain: new URL(url).hostname
        };

        return {
            success: true,
            metadata: metadata
        };
    } catch (error) {
        console.error('Error extracting metadata:', error);
        return {
            success: false,
            error: 'Failed to process link'
        };
    }
}

// Extract title from URL
function extractTitleFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace('www.', '');
        const pathname = urlObj.pathname.split('/').filter(Boolean);
        
        if (pathname.length > 0) {
            // Use last path segment as title
            return decodeURIComponent(pathname[pathname.length - 1])
                .replace(/-|_/g, ' ')
                .replace(/\.[^/.]+$/, '') // remove extension
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
        
        return hostname;
    } catch {
        return 'Link';
    }
}

// Get default image (platform based)
function getDefaultImage(url) {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        
        // Known platforms
        if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
            return 'https://img.icons8.com/color/480/youtube-play.png';
        }
        if (hostname.includes('facebook.com') || hostname.includes('fb.com')) {
            return 'https://img.icons8.com/fluency/480/facebook-new.png';
        }
        if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
            return 'https://img.icons8.com/fluency/480/twitter.png';
        }
        if (hostname.includes('instagram.com')) {
            return 'https://img.icons8.com/fluency/480/instagram-new.png';
        }
        if (hostname.includes('linkedin.com')) {
            return 'https://img.icons8.com/fluency/480/linkedin.png';
        }
        if (hostname.includes('github.com')) {
            return 'https://img.icons8.com/fluency/480/github.png';
        }
        if (hostname.includes('reddit.com')) {
            return 'https://img.icons8.com/fluency/480/reddit.png';
        }
        
        // Generic link icon
        return 'https://img.icons8.com/fluency/480/link.png';
    } catch {
        return 'https://img.icons8.com/fluency/480/link.png';
    }
}

// URL validation
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

// Update link preview UI
export function updateLinkPreview(metadata) {
    const previewContainer = document.getElementById('linkPreview');
    const previewImage = document.getElementById('previewImage');
    const previewTitle = document.getElementById('previewTitle');
    const previewDescription = document.getElementById('previewDescription');
    const previewUrl = document.getElementById('previewUrl');

    if (!previewContainer) return;

    // Update preview content
    if (previewImage) previewImage.src = metadata.image;
    if (previewTitle) previewTitle.textContent = metadata.title;
    if (previewDescription) previewDescription.textContent = metadata.description;
    if (previewUrl) {
        previewUrl.textContent = metadata.domain;
        previewUrl.href = metadata.url;
    }

    // Show preview
    previewContainer.classList.add('show');
}

// Hide link preview
export function hideLinkPreview() {
    const previewContainer = document.getElementById('linkPreview');
    if (previewContainer) {
        previewContainer.classList.remove('show');
    }
}

// Extract domain name from URL
export function extractDomain(url) {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return '';
    }
}

// Extract YouTube video ID
export function extractYouTubeId(url) {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtube.com')) {
            return urlObj.searchParams.get('v');
        }
        if (urlObj.hostname.includes('youtu.be')) {
            return urlObj.pathname.slice(1);
        }
        return null;
    } catch {
        return null;
    }
}

// Get YouTube thumbnail
export function getYouTubeThumbnail(videoId) {
    if (!videoId) return null;
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// Image URL validation
export function isImageUrl(url) {
    try {
        const urlLower = url.toLowerCase();
        return /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(urlLower);
    } catch {
        return false;
    }
}

// Check if URL is accessible
export async function checkUrlAccessibility(url) {
    try {
        // Simple check - if URL is valid
        new URL(url);
        return { success: true };
    } catch (error) {
        return { 
            success: false, 
            error: 'Invalid URL' 
        };
    }
}

// Shorten URL (for display)
export function shortenUrl(url, maxLength = 50) {
    if (url.length <= maxLength) return url;
    
    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        const path = urlObj.pathname + urlObj.search;
        
        if (domain.length + 10 >= maxLength) {
            return domain.substring(0, maxLength - 3) + '...';
        }
        
        const remainingLength = maxLength - domain.length - 6;
        const shortenedPath = path.length > remainingLength 
            ? '...' + path.substring(path.length - remainingLength)
            : path;
            
        return domain + shortenedPath;
    } catch {
        return url.substring(0, maxLength) + '...';
    }
}

// Extract URLs from post content
export function extractUrlsFromText(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);
    return urls || [];
}

// Auto-link detection and preview suggestion
export function detectAndSuggestLink(text) {
    const urls = extractUrlsFromText(text);
    if (urls.length > 0) {
        return {
            hasUrl: true,
            url: urls[0] // Take first URL
        };
    }
    return { hasUrl: false };
}