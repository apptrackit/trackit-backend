/**
 * Clipboard Helper Functions
 * Provides fallback methods for copying to clipboard in browsers with limited support
 */

// Copy text to clipboard with fallback support
function copyTextToClipboard(text) {
    // Try using the modern Clipboard API
    if (navigator.clipboard) {
        return navigator.clipboard.writeText(text)
            .catch(err => {
                console.error('Clipboard API error:', err);
                // Fall back to older method if Clipboard API fails
                return fallbackCopyTextToClipboard(text);
            });
    } else {
        // Use fallback for browsers without Clipboard API
        return fallbackCopyTextToClipboard(text);
    }
}

// Fallback copy method using document.execCommand
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Make the textarea invisible but still selectable
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (!successful) {
            throw new Error('Copy command was unsuccessful');
        }
        return Promise.resolve();
    } catch (err) {
        console.error('Fallback copy error:', err);
        return Promise.reject(err);
    } finally {
        document.body.removeChild(textArea);
    }
}
