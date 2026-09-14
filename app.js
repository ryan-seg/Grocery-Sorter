// Load saved API key on startup
window.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) document.getElementById('apiKey').value = savedKey;

    // Handle Share Target from Keep
    const urlParams = new URLSearchParams(window.location.search);
    const sharedText = urlParams.get('text');
    const sharedTitle = urlParams.get('title');
    if (sharedText) {
        window.history.replaceState({}, document.title, window.location.pathname);
        document.getElementById('inputList').value = sharedTitle ? `${sharedTitle}\n${sharedText}` : sharedText;
    }
});

// SORT USING AI
document.getElementById('btnSort').addEventListener('click', async () => {
    const apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) {
        alert("Please paste your Gemini API key at the top first!");
        return;
    }
    
    // Save the key so you don't have to enter it again
    localStorage.setItem('gemini_api_key', apiKey);

    const inputText = document.getElementById('inputList').value;
    const btn = document.getElementById('btnSort');
    
    // 1. Filter out checked items and clean up the text
    let items = inputText.split('\n')
        .filter(item => {
            const isChecked = /^\s*(\[x\]|\[X\]|☑|✅)/.test(item);
            return !isChecked; 
        })
        .map(item => item.replace(/^\s*(\[\s?\]|☐|\*|-|\+)\s*/, '').trim())
        .filter(item => item.length > 0);

    if (items.length === 0) return alert("No unchecked items found to sort!");

    // 2. Ask the AI to sort it
    btn.innerText = "⏳ Sorting... (Takes a few seconds)";
    btn.disabled = true;

    const prompt = `You are a British supermarket grocery sorter. Categorize the following list of items into these exact categories: Produce, Dairy & Chilled, Meat & Fish, Bakery, Pantry, Household, Toiletries, Frozen, Other. Understand brand names (e.g. Norpak is butter/dairy, Sainos is Sainsbury's). Correct minor typos silently. 
    Return ONLY a raw JSON object where keys are the category names and values are arrays of strings. Do not include markdown formatting or backticks.
    List to sort: ${JSON.stringify(items)}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        
        // Extract the AI's text and strip out any accidental markdown
        let aiText = data.candidates[0].content.parts[0].text;
        aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const categorizedList = JSON.parse(aiText);

        // 3. Format the final output
        let outputText = "Organized Groceries\n\n";
        for (const [category, catItems] of Object.entries(categorizedList)) {
            if (catItems && catItems.length > 0) {
                outputText += `${category.toUpperCase()}:\n`;
                catItems.forEach(i => outputText += `[ ] ${i}\n`);
                outputText += `\n`;
            }
        }

        document.getElementById('outputList').value = outputText.trim();
    } catch (error) {
        console.error(error);
        alert("Something went wrong with the AI. Check your API key or try again.");
    } finally {
        btn.innerText = "✨ Sort with AI";
        btn.disabled = false;
    }
});

// SHARE BACK TO KEEP 
document.getElementById('btnShare').addEventListener('click', async () => {
    const textToShare = document.getElementById('outputList').value;
    if (!textToShare) return alert("Nothing to share!");
    if (navigator.share) {
        try { await navigator.share({ title: 'Organized Groceries', text: textToShare }); } 
        catch (err) { console.error('Error sharing:', err); }
    } else {
        alert("Use the Copy button instead.");
    }
});

// COPY FALLBACK 
document.getElementById('btnCopy').addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('outputList').value).then(() => {
        alert("Copied to clipboard!");
    });
});
        
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
