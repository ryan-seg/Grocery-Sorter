let categories = JSON.parse(localStorage.getItem('categories')) || [
    "Produce", "Dairy & Chilled", "Meat & Fish", "Bakery", "Pantry", "Household", "Toiletries", "Frozen", "Miscellaneous"
];

let supermarkets = JSON.parse(localStorage.getItem('supermarkets')) || {};
let editingSupermarket = null;
let currentSortedData = {};

window.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) document.getElementById('apiKey').value = savedKey;

    updateSupermarketDropdown();
    renderCategories();
    renderSupermarkets();

    const urlParams = new URLSearchParams(window.location.search);
    const sharedText = urlParams.get('text');
    const sharedTitle = urlParams.get('title');
    if (sharedText) {
        window.history.replaceState({}, document.title, window.location.pathname);
        document.getElementById('inputList').value = sharedTitle ? `${sharedTitle}\n${sharedText}` : sharedText;
    }

    document.getElementById('toggleSettings').addEventListener('click', () => {
        document.getElementById('settingsPanel').classList.toggle('hidden');
    });

    document.getElementById('btnAddCategory').addEventListener('click', () => {
        const val = document.getElementById('newCategory').value.trim();
        if (val && !categories.includes(val)) {
            categories.push(val);
            saveData();
            renderCategories();
            document.getElementById('newCategory').value = '';
            if (editingSupermarket) renderLayoutEditor(editingSupermarket);
        }
    });

    document.getElementById('btnAddSupermarket').addEventListener('click', () => {
        const val = document.getElementById('newSupermarket').value.trim();
        if (val && !supermarkets[val]) {
            supermarkets[val] = [...categories]; 
            saveData();
            renderSupermarkets();
            updateSupermarketDropdown();
            document.getElementById('newSupermarket').value = '';
        }
    });

    document.getElementById('btnExport').addEventListener('click', exportBackup);
    document.getElementById('btnImportTrigger').addEventListener('click', () => document.getElementById('importFile').click());
    document.getElementById('importFile').addEventListener('change', importBackup);

    document.getElementById('btnSort').addEventListener('click', sortListWithAI);
    document.getElementById('btnCopy').addEventListener('click', copyChecklistToClipboard);
    document.getElementById('btnClearList').addEventListener('click', () => {
        if (confirm("Clear current shopping list?")) {
            document.getElementById('outputContainer').classList.add('hidden');
            document.getElementById('checklistArea').innerHTML = '';
        }
    });
});

function renderCategories() {
    const list = document.getElementById('categoryList');
    list.innerHTML = '';
    categories.forEach((cat, index) => {
        list.innerHTML += `
            <div class="list-item">
                <span>${cat}</span>
                <button class="secondary-btn" onclick="deleteCategory(${index})">Delete</button>
            </div>`;
    });
}

window.deleteCategory = function(index) {
    if (categories.length <= 1) return alert("You must keep at least one category.");
    const removed = categories[index];
    if (confirm(`Delete category '${removed}'? Items will fall back to Miscellaneous.`)) {
        categories.splice(index, 1);
        if (!categories.includes("Miscellaneous")) categories.push("Miscellaneous");
        saveData();
        renderCategories();
        if (editingSupermarket) renderLayoutEditor(editingSupermarket);
    }
}

function renderSupermarkets() {
    const list = document.getElementById('supermarketList');
    list.innerHTML = '';
    const sortedKeys = Object.keys(supermarkets).sort((a, b) => a.localeCompare(b));
    
    if (sortedKeys.length === 0) {
        list.innerHTML = '<p><small>No supermarkets added yet. Add one above!</small></p>';
        return;
    }
    sortedKeys.forEach(name => {
        list.innerHTML += `
            <div class="list-item">
                <strong>${name}</strong>
                <div>
                    <button class="secondary-btn" onclick="editLayout('${name}')">Aisles</button>
                    <button class="danger-btn" onclick="deleteSupermarket('${name}')">X</button>
                </div>
            </div>`;
    });
}

window.deleteSupermarket = function(name) {
    if (confirm(`Delete layout for '${name}'?`)) {
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
    const sortedKeys = Object.keys(supermarkets).sort((a, b) => a.localeCompare(b));
    sortedKeys.forEach(name => {
        select.innerHTML += `<option value="${name}">${name}</option>`;
    });
}

window.editLayout = function(name) {
    editingSupermarket = name;
    document.getElementById('supermarketLayoutArea').classList.remove('hidden');
    document.getElementById('layoutTitle').innerText = `Edit Aisle Layout: ${name}`;
    renderLayoutEditor(name);
}

function renderLayoutEditor(name) {
    let layout = supermarkets[name] || [...categories];
    categories.forEach(cat => { if (!layout.includes(cat)) layout.push(cat); });
    layout = layout.filter(cat => categories.includes(cat));
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
            </div>`;
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

function exportBackup() {
    const backupData = { categories, supermarkets };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grocery-sorter-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
}

function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.categories && data.supermarkets) {
                categories = data.categories;
                supermarkets = data.supermarkets;
                saveData();
                renderCategories();
                renderSupermarkets();
                updateSupermarketDropdown();
                alert("Backup imported successfully!");
            } else {
                alert("Invalid backup file structure.");
            }
        } catch (err) {
            alert("Error reading backup file.");
        }
    };
    reader.readAsText(file);
}

function saveData() {
    localStorage.setItem('categories', JSON.stringify(categories));
    localStorage.setItem('supermarkets', JSON.stringify(supermarkets));
}

// AI Sorting with Primary (Flash Latest) and Backup (Pro Latest) Fallback Chain
async function sortListWithAI() {
    const apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) return alert("Please paste your Gemini API key in the top box first!");
    localStorage.setItem('gemini_api_key', apiKey);

    const inputText = document.getElementById('inputList').value;
    const ignoreChecked = document.getElementById('ignoreChecked').checked;
    const btn = document.getElementById('btnSort');
    
    let items = inputText.split('\n')
        .filter(item => {
            const isChecked = /^\s*(\[x\]|\[X\]|☑|✅)/.test(item);
            if (ignoreChecked && isChecked) return false; 
            return true;
        })
        .map(item => item.replace(/^\s*(\[\s?\]|☐|\*|-|\+)\s*/, '').trim())
        .filter(item => item.length > 0);

    if (items.length === 0) return alert("No active/unchecked items found to sort!");

    btn.innerText = "⏳ Sorting List...";
    btn.disabled = true;

    if (!categories.includes("Miscellaneous")) categories.push("Miscellaneous");

    const prompt = `You are an expert British grocery store categorizer. Categorize the following shopping list items into ONLY these exact categories: ${categories.join(', ')}. 
    If an item does not fit cleanly anywhere, assign it to "Miscellaneous". Account for UK brand names (e.g., Norpak is Dairy, Sainos is Sainsbury's) and correct minor typos.
    Return ONLY a raw JSON object where keys are the category names and values are arrays of strings. Do NOT include markdown code ticks like \`\`\`json.
    List: ${JSON.stringify(items)}`;

    // Fallback chain: Primary model first, Backup model second
    const modelsToTry = ["gemini-flash-latest", "gemini-pro-latest"];
    let success = false;
    let aiText = "";

    for (const model of modelsToTry) {
        if (success) break;
        
        // Try each model twice in case of a temporary blip
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                btn.innerText = `⏳ Sorting using ${model === 'gemini-flash-latest' ? 'Flash' : 'Backup'}...`;
                
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });

                const data = await response.json();
                
                if (data.error) {
                    // If overloaded (503), wait and retry or switch to backup model
                    if (data.error.code === 503 || String(data.error.message).includes("high demand")) {
                        await new Promise(r => setTimeout(r, 1500));
                        continue;
                    }
                    throw new Error(data.error.message);
                }

                aiText = data.candidates[0].content.parts[0].text;
                success = true;
                break;
            } catch (err) {
                console.warn(`Model ${model} attempt ${attempt} failed:`, err);
                if (attempt === 2) break; // Move to backup model
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }

    btn.innerText = "✨ Sort Shopping List";
    btn.disabled = false;

    if (!success) {
        alert("Both primary and backup AI servers are experiencing high traffic. Please wait a moment and try again.");
        return;
    }

    try {
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Could not parse AI response.");
        
        currentSortedData = JSON.parse(jsonMatch[0]);
        renderChecklistUI();
        document.getElementById('outputContainer').classList.remove('hidden');
        document.getElementById('outputContainer').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error(error);
        alert(`Parsing failed: ${error.message}`);
    }
}

function renderChecklistUI() {
    const area = document.getElementById('checklistArea');
    area.innerHTML = '';

    const selectedSupermarket = document.getElementById('supermarketSelect').value;
    const sortOrder = selectedSupermarket === "Default" ? categories : (supermarkets[selectedSupermarket] || categories);

    sortOrder.forEach(cat => { if (!currentSortedData[cat]) currentSortedData[cat] = []; });

    sortOrder.forEach(category => {
        const items = currentSortedData[category] || [];
        if (items.length === 0) return;

        let groupHtml = `
            <div class="category-group">
                <h4>${category}</h4>
        `;

        items.forEach((item, itemIndex) => {
            groupHtml += `
                <div class="grocery-row" id="row-${category}-${itemIndex}">
                    <div class="grocery-left">
                        <input type="checkbox" onchange="toggleCheck(this)">
                        <span>${item}</span>
                    </div>
                    <button class="secondary-btn" onclick="openMoveModal('${category}', ${itemIndex})">Move</button>
                </div>
            `;
        });

        groupHtml += `</div>`;
        area.innerHTML += groupHtml;
    });
}

window.toggleCheck = function(checkbox) {
    const row = checkbox.closest('.grocery-row');
    if (checkbox.checked) {
        row.classList.add('checked');
    } else {
        row.classList.remove('checked');
    }
}

window.openMoveModal = function(fromCategory, itemIndex) {
    const itemName = currentSortedData[fromCategory][itemIndex];
    const targetCat = prompt(`Move "${itemName}" from ${fromCategory} to which category?\n\nAvailable categories:\n${categories.filter(c => c !== fromCategory).join(', ')}`);
    
    if (targetCat && categories.includes(targetCat)) {
        currentSortedData[fromCategory].splice(itemIndex, 1);
        if (!currentSortedData[targetCat]) currentSortedData[targetCat] = [];
        currentSortedData[targetCat].push(itemName);
        renderChecklistUI();
    } else if (targetCat) {
        alert("Category not found. Please match exact category names.");
    }
}

function copyChecklistToClipboard() {
    let outputText = "Organized Groceries\n\n";
    const selectedSupermarket = document.getElementById('supermarketSelect').value;
    const sortOrder = selectedSupermarket === "Default" ? categories : (supermarkets[selectedSupermarket] || categories);

    sortOrder.forEach(category => {
        const items = currentSortedData[category] || [];
        if (items.length > 0) {
            outputText += `${category.toUpperCase()}:\n`;
            items.forEach(i => outputText += `[ ] ${i}\n`);
            outputText += `\n`;
        }
    });

    navigator.clipboard.writeText(outputText.trim()).then(() => {
        alert("Checklist copied to clipboard! You can paste it into Keep or notes.");
    });
}
