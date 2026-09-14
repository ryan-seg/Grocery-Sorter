// A simple mock database of categories (you can add more items here later!)
const groceryDictionary = {
    "Produce": ["apple", "banana", "lettuce", "tomato", "onion", "garlic", "potato", "carrot", "avocado", "veg", "fruit"],
    "Dairy": ["milk", "cheese", "butter", "yogurt", "cream", "cheddar", "mozzarella", "eggs"],
    "Meat": ["chicken", "beef", "pork", "sausage", "bacon", "mince", "ham", "steak"],
    "Bakery": ["bread", "buns", "bagel", "wrap", "pita", "sourdough", "crumpet"],
    "Pantry": ["juice", "oil", "ketchup", "paste", "chips", "seasoning", "sauce", "beans", "tahini", "sweetener", "latte", "stock", "rice", "marmite", "mash", "trebor", "sugar", "flour", "pasta", "spice", "honey"],
    "Household": ["cleaner", "wipes", "bags", "freshener", "foil", "tape", "roll", "detergent", "tablets", "plug-ins"],
    "Toiletries": ["spray", "balm", "mouthwash", "toothpaste", "deodorant", "gel", "floss"],
    "Frozen": ["ice cream", "frozen", "ice"]
};

// 1. HANDLE INCOMING SHARE 
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedText = urlParams.get('text');
    const sharedTitle = urlParams.get('title');
    
    if (sharedText) {
        window.history.replaceState({}, document.title, window.location.pathname);
        document.getElementById('inputList').value = sharedTitle ? `${sharedTitle}\n${sharedText}` : sharedText;
    }
});

// 2. SORT THE LIST (Fixed Logic)
document.getElementById('btnSort').addEventListener('click', () => {
    const inputText = document.getElementById('inputList').value;
    
    let items = inputText.split('\n')
        .filter(item => {
            // Ignore items that are checked off [x], [X], ☑, or ✅
            const isChecked = /^\s*(\[x\]|\[X\]|☑|✅)/.test(item);
            return !isChecked; 
        })
        .map(item => item.replace(/^\s*(\[\s?\]|☐|\*|-|\+)\s*/, '').trim()) // Clean unchecked boxes/bullets
        .filter(item => item.length > 0); // Remove empty lines
        
    // THIS IS THE FIX: Automatically create buckets based on your dictionary
    let categorizedList = {};
    for (const key of Object.keys(groceryDictionary)) {
        categorizedList[key] = [];
    }
    categorizedList["Other"] = []; // Always ensure the "Other" bucket exists

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


// 3. SHARE BACK TO KEEP 
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
        } catch (err) {
            console.error('Error sharing:', err);
        }
    } else {
        alert("Web Share API is not supported on this browser. Use the Copy button instead.");
    }
});

// 4. COPY FALLBACK 
document.getElementById('btnCopy').addEventListener('click', () => {
    const textToCopy = document.getElementById('outputList').value;
    navigator.clipboard.writeText(textToCopy).then(() => {
        alert("Copied to clipboard! Paste it into a new Keep note.");
    });
});
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
