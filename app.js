// Default data
let categories = JSON.parse(localStorage.getItem('categories')) || ["Produce", "Dairy & Chilled", "Meat & Fish", "Bakery", "Pantry", "Household", "Toiletries", "Frozen", "Other"];
let supermarkets = JSON.parse(localStorage.getItem('supermarkets')) || {};
let editingSupermarket = null;

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) document.getElementById('apiKey').value = savedKey;

    updateSupermarketDropdown();
    renderCategories();
    renderSupermarkets();

    // Handle Keep Share
    const urlParams = new URLSearchParams(window.location.search);
    const sharedText = urlParams.get('text');
    const sharedTitle = urlParams.get('title');
    if (sharedText) {
        window.history.replaceState({}, document.title, window.location.pathname);
        document.getElementById('inputList').value = sharedTitle ? `${sharedTitle}\n${sharedText}` : sharedText;
    }
});

// Settings Toggle
document.getElementById('toggleSettings').addEventListener('click', () => {
    const panel = document.getElementById('settingsPanel');
    panel.classList.toggle('hidden');
});

// --- CATEGORY MANAGEMENT ---
document.getElementById('btnAddCategory').addEventListener('click', () => {
    const val = document.getElementById('newCategory').value.trim();
    if (val && !categories.includes(val)) {
        categories.push(val);
        saveData();
        renderCategories();
        document.getElementById('newCategory').value = '';
        if(editingSupermarket) renderLayoutEditor(editingSupermarket);
    }
});

function renderCategories() {
    const list = document.getElementById('categoryList');
    list.innerHTML = '';
    categories.forEach((cat, index) => {
        list.innerHTML += `
            <div class="list-item">
                <span>${cat}</span>
                <button class="secondary-btn" onclick="deleteCategory(${index})">X</button>
            </div>
        `;
    });
}

window.deleteCategory = function(index) {
    if (confirm(`Delete '${categories[index]}'?`)) {
        categories.splice(index, 1);
        saveData();
        renderCategories();
        if(editingSupermarket) renderLayoutEditor(editingSupermarket);
    }
}

// --- SUPERMARKET MANAGEMENT ---
document.getElementById('btnAddSupermarket').addEventListener('click', () => {
    const val = document.getElementById('newSupermarket').value.trim();
    if (val && !supermarkets[val]) {
        supermarkets[val] = [...categories]; // Copy current categories for default order
        saveData();
        renderSupermarkets();
        updateSupermarketDropdown();
        document.getElementById('newSupermarket').value = '';
    }
});

function renderSupermarkets() {
    const list = document.getElementById('supermarketList');
    list.innerHTML = '';
    Object.keys(supermarkets).forEach(name => {
        list.innerHTML += `
            <div class="list-item">
                <strong>${name}</strong>
                <div>
                    <button class="secondary-btn" onclick="editLayout('${name}')">Edit Aisle Order</button>
                    <button class="secondary-btn" onclick="deleteSupermarket('${name}')">X</button>
                </div>
            </div>
        `;
    });
}

window.deleteSupermarket = function(name) {
    if (confirm(`Delete '${name}'?`)) {
        delete supermarkets[name];
        if (editingSupermarket === name) {
            document.getElementById('supermarketLayoutArea').classList.add('hidden');
            editingSupermarket = null;
        }
        saveData();
        renderSupermarkets();
        updateSupermarketDropdown();
    }
}

function updateSupermarketDropdown() {
    const select = document.getElementById('supermarketSelect');
    select.innerHTML = '<option value="Default">Default Order</option>';
    Object.keys(supermarkets).forEach(name => {
        select.innerHTML += `<option value="${name}">${name}</option>`;
    });
}

// --- LAYOUT EDITOR ---
window.editLayout = function(name) {
    editingSupermarket = name;
    document.getElementById('supermarketLayoutArea').classList.remove('hidden');
    document.getElementById('layoutTitle').innerText = `Edit Layout: ${name}`;
    renderLayoutEditor(name);
}

function renderLayoutEditor(name) {
    // Ensure supermarket has all current global categories
    let layout = supermarkets[name];
    categories.forEach(cat => { if (!layout.includes(cat)) layout.push(cat); });
    layout = layout.filter(cat => categories.includes(cat)); // Remove deleted ones
    supermarkets[name] = layout;
    saveData();

    const list = document.getElementById('layoutList');
    list.innerHTML = '';
    layout.forEach((cat, index) => {
        list.innerHTML += `
            <div class="list-item">
                <span>${index + 1}. ${cat}</span>
                <div>
                    <button class="secondary-btn" onclick="moveCat('${name}', ${index}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
                    <button class="secondary-btn" onclick="moveCat('${name}', ${index}, 1)" ${index === layout.length - 1 ? 'disabled' : ''}>↓</button>
                </div>
            </div>
        `;
    });
}

window.moveCat = function(name, index, direction) {
    const layout = supermarkets[name];
    const temp = layout[index];
    layout[index] = layout[index + direction];
    layout[index + direction] = temp;
    saveData();
    renderLayoutEditor(name);
}

function saveData() {
    localStorage.setItem('categories', JSON.stringify(categories));
    localStorage.setItem('supermarkets', JSON.stringify(supermarkets));
}

// --- AI SORTING ---
document.getElementById('btnSort').addEventListener('click', async () => {
    const apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) return alert("Please paste your Gemini API key at the top first!");
    localStorage.setItem('gemini_api_key', apiKey);

    const inputText = document.getElementById('inputList').value;
    const btn = document.getElementById('btnSort');
    
    let items = inputText.split('\n')
        .filter(item => !/^\s*(\[x\]|\[X\]|☑|✅)/.test(item))
        .map(item => item.replace(/^\s*(\[\s?\]|☐|\*|-|\+)\s*/, '').trim())
        .filter(item => item.length > 0);

    if (items.length === 0) return alert("No unchecked items found to sort!");

    btn.innerText = "⏳ Sorting... (Takes a few seconds)";
    btn.disabled = true;

    const prompt = `You are a British supermarket grocery sorter. Categorize the following list of items into ONLY these exact categories: ${categories.join(', ')}.
    Understand UK brand names and slang. Correct minor typos silently.
    Return ONLY a raw JSON object where keys are the category names and values are arrays of strings. Do not include markdown formatting like \`\`\`json.
    List to sort: ${JSON.stringify(items)}`;

    try {
        const response = await fetch(`[https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$](https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$){apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        
        if (data.error) throw new Error(data.error.message);

        let aiText = data.candidates[0].content.parts[0].text;
        
        // Bulletproof JSON extraction
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI did not return proper data.");
        
        const categorizedList = JSON.parse(jsonMatch[0]);

        // Get correct order
        const selectedSupermarket = document.getElementById('supermarketSelect').value;
        const sortOrder = selectedSupermarket === "Default" ? categories : supermarkets[selectedSupermarket];

        let outputText = "Organized Groceries\n\n";
        
        // Loop through chosen layout order
        sortOrder.forEach(category => {
            if (categorizedList[category] && categorizedList[category].length > 0) {
                outputText += `${category.toUpperCase()}:\n`;
                categorizedList[category].forEach(i => outputText += `[ ] ${i}\n`);
                outputText += `\n`;
                delete categorizedList[category]; 
            }
        });

        // Catch any categories the AI hallucinated that aren't in the official list
        for (const [category, catItems] of Object.entries(categorizedList)) {
            if (catItems && catItems.length > 0) {
                outputText += `${category.toUpperCase()} (Other):\n`;
                catItems.forEach(i => outputText += `[ ] ${i}\n`);
                outputText += `\n`;
            }
        }

        document.getElementById('outputList').value = outputText.trim();
    } catch (error) {
        console.error(error);
        alert(`Error sorting: ${error.message || "Failed to parse AI data."}`);
    } finally {
        btn.innerText = "✨ Sort with AI";
        btn.disabled = false;
    }
});

// --- SHARING & COPYING ---
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

document.getElementById('btnCopy').addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('outputList').value).then(() => {
        alert("Copied to clipboard!");
    });
});
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
