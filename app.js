// A simple mock database of categories
const groceryDictionary = {
    "Produce": ["apple", "apples", "banana", "lettuce", "tomato", "onion", "garlic"],
    "Dairy": ["milk", "cheese", "butter", "yogurt"],
    "Meat": ["chicken", "beef", "pork", "sausage"],
    "Bakery": ["bread", "buns", "bagel"]
};

// 1. HANDLE INCOMING SHARE (Web Share Target)
// When Keep shares via GET, it puts the text in the URL parameters
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedText = urlParams.get('text');
    const sharedTitle = urlParams.get('title');
    
    if (sharedText) {
        // Strip out the URL params so reloading doesn't duplicate the action
        window.history.replaceState({}, document.title, window.location.pathname);
        document.getElementById('inputList').value = sharedTitle ? `${sharedTitle}\n${sharedText}` : sharedText;
    }
});

// 2. SORT THE LIST
document.getElementById('btnSort').addEventListener('click', () => {
    const inputText = document.getElementById('inputList').value;
    
    // Split by lines, remove empty lines and Keep's checkbox formatting (like [ ] or ☑)
// 2. SORT THE LIST
document.getElementById('btnSort').addEventListener('click', () => {
    const inputText = document.getElementById('inputList').value;
    
    let items = inputText.split('\n')
        // 1. Remove items that are already checked
        .filter(item => {
            // Keep looks for [x], [X], ☑, or ✅
            const isChecked = /^\s*(\[x\]|\[X\]|☑|✅)/.test(item);
            return !isChecked; // Keep only if NOT checked
        })
        // 2. Clean up the remaining unchecked boxes/bullets
        .map(item => item.replace(/^\s*(\[\s?\]|☐|\*|-|\+)\s*/, '').trim())
        // 3. Remove empty lines
        .filter(item => item.length > 0);

    let categorizedList = {
        "Produce": [],
        "Dairy": [],
        "Meat": [],
        "Bakery": [],
        "Other": []
    };

    // Sort items into categories
    items.forEach(item => {
        let foundCategory = "Other";
        const lowerItem = item.toLowerCase();
        
        for (const [category, keywords] of Object.entries(groceryDictionary)) {
            if (keywords.some(keyword => lowerItem.includes(keyword))) {
                foundCategory = category;
                break;
            }
        }
        categorizedList[foundCategory].push(item);
    });

    // Format output text
    let outputText = "Organized Groceries\n\n";
    for (const [category, catItems] of Object.entries(categorizedList)) {
        if (catItems.length > 0) {
            outputText += `${category.toUpperCase()}:\n`;
            catItems.forEach(i => outputText += `${i}\n`);
            outputText += `\n`;
        }
    }

    document.getElementById('outputList').value = outputText.trim();
});

// 3. SHARE BACK TO KEEP (Web Share API)
document.getElementById('btnShare').addEventListener('click', async () => {
    const textToShare = document.getElementById('outputList').value;
    
    if (!textToShare) {
        alert("Nothing to share!");
        return;
    }

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Organized Groceries',
                text: textToShare,
            });
            console.log('Successfully shared');
        } catch (err) {
            console.error('Error sharing:', err);
        }
    } else {
        alert("Web Share API is not supported on this browser. Use the Copy button instead.");
    }
});

// 4. COPY FALLBACK (Clipboard API)
document.getElementById('btnCopy').addEventListener('click', () => {
    const textToCopy = document.getElementById('outputList').value;
    navigator.clipboard.writeText(textToCopy).then(() => {
        alert("Copied to clipboard! Paste it into a new Keep note.");
    });
});
