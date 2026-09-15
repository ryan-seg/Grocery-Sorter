// --- DEFAULT APP STATE ---
let categories = ["Produce", "Dairy & Chilled", "Meat & Fish", "Bakery", "Pantry", "Household", "Toiletries", "Frozen", "Free From", "Beer, Wine & Spirits", "Miscellaneous"];
try {
    const savedCats = localStorage.getItem('categories');
    if (savedCats) {
        const parsed = JSON.parse(savedCats);
        if (Array.isArray(parsed) && parsed.length > 0) categories = parsed;
    }
} catch (e) { console.error("Memory reset for categories."); }

let supermarkets = {};
try {
    const savedSupers = localStorage.getItem('supermarkets');
    if (savedSupers) {
        const parsed = JSON.parse(savedSupers);
        if (typeof parsed === 'object' && parsed !== null) supermarkets = parsed;
    }
} catch (e) { console.error("Memory reset for supermarkets."); }

let editingSupermarket = null;
let currentSortedData = {};
let moveContext = null;

// Safe App Initialization
function initApp() {
    const savedGroq = localStorage.getItem('groq_api_key');
    if (savedGroq) document.getElementById('groqKey').value = savedGroq;

    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) document.getElementById('apiKey').value = savedKey;

    updateSupermarketDropdown();
    renderCategories();
    renderSupermarkets();

    const lastSupermarket = localStorage.getItem('last_supermarket');
    if (lastSupermarket && document.getElementById('supermarketSelect')) {
        document.getElementById('supermarketSelect').value = lastSupermarket;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const sharedText = urlParams.get('text');
    const sharedTitle = urlParams.get('title');
    if (sharedText) {
        window.history.replaceState({}, document.title, window.location.pathname);
        document.getElementById('inputList').value = sharedTitle ? `${sharedTitle}\n${sharedText}` : sharedText;
    }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initApp();
} else {
    document.addEventListener('DOMContentLoaded', initApp);
}

// UI Handlers
window.toggleSettingsPanel = function() {
    document.getElementById('settingsPanel').classList.toggle('hidden');
}

window.saveSupermarketChoice = function() {
    const val = document.getElementById('supermarketSelect').value;
    localStorage.setItem('last_supermarket', val);
    if (Object.keys(currentSortedData).length > 0) renderChecklistUI();
}

window.pasteFromClipboard = async function() {
    try {
        const text = await navigator.clipboard.readText();
        if (text) document.getElementById('inputList').value = text;
    } catch (err) {
        alert("Clipboard permission denied. Please paste manually into the text box.");
    }
}

window.addCategory = function() {
    const val = document.getElementById('newCategory').value.trim();
    if (val && !categories.includes(val)) {
        categories.push(val);
        saveData();
        renderCategories();
        document.getElementById('newCategory').value = '';
        if (editingSupermarket) renderLayoutEditor(editingSupermarket);
    }
}

function renderCategories() {
    const list = document.getElementById('categoryList');
    if (!list) return;
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

window.addSupermarket = function() {
    const val = document.getElementById('newSupermarket').value.trim();
    if (val && !supermarkets[val]) {
        supermarkets[val] = [...categories]; 
        saveData();
        renderSupermarkets();
        updateSupermarketDropdown();
        document.getElementById('newSupermarket').value = '';
    }
}

function renderSupermarkets() {
    const list = document.getElementById('supermarketList');
    if (!list) return;
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
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="Default">Default Order</option>';
    const sortedKeys = Object.keys(supermarkets).sort((a, b) => a.localeCompare(b));
    sortedKeys.forEach(name => {
        select.innerHTML += `<option value="${name}">${name}</option>`;
    });
    if (sortedKeys.includes(currentVal)) select.value = currentVal;
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
    if (!list) return;
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

window.exportBackup = function() {
    const backupData = { categories, supermarkets };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grocery-sorter-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
}

window.triggerImport = function() {
    document.getElementById('importFile').click();
}

window.importBackup = function(event) {
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

function setAIStatus(msg, type) {
    const el = document.getElementById('aiStatus');
    if (!el) return;
    el.innerText = msg;
    el.className = `status-${type}`;
}

// --- LOCAL DICTIONARY ENGINE (OFFLINE FALLBACK) ---
function runLocalFallbackSort(items) {
    let result = {};
    categories.forEach(c => result[c] = []);
    
    const rules = {
        "Produce": ["veg", "vegetables", "fruit", "fruits", "salad", "salads", "apple", "apples", "banana", "bananas", "avo", "avos", "avocado", "avocadoes", "avocados", "lemon", "lemons", "lime", "limes", "strawberry", "strawberries", "strawbs", "blueberry", "blueberries", "raspberry", "raspberries", "peach", "peaches", "pomegranate", "cherry", "cherries", "mango", "tomato", "tomatoes", "datterino", "onion", "onions", "garlic", "potato", "potatoes", "spud", "spuds", "carrot", "carrots", "rocket", "lettuce", "cucumber", "courgette", "courgettes", "pepper", "peppers", "mushroom", "mushrooms", "spinach", "bean", "beans", "runner beans", "green beans", "stringless beans", "cabbage", "leek", "leeks", "asparagus", "herb", "herbs", "basil", "chive", "chives", "mint", "sweet potato", "sweet potatoes", "aubergine", "spring onion", "spring onions", "corn", "celery"],
        "Dairy & Chilled": ["dairy", "milk", "milks", "lf milk", "oat milk", "longlife milk", "uht milk", "cheese", "cheeses", "cheddar", "mozzarella", "parmesan", "parmigiano", "feta", "burrata", "halloumi", "cottage cheese", "cream cheese", "mascarpone", "sour cream", "creme fraiche", "whipping cream", "double cream", "clotted cream", "elmlea", "butter", "norpak", "margarine", "egg", "eggs", "yoghurt", "yogurts", "yogurt", "kefir", "puddings", "pudding", "custard", "cooked meats", "ham", "cured meats", "quiche", "ready meals", "lasagne sheets", "shortcrust pastry", "garlic bread", "hummus", "dip", "dips", "perinnaise"],
        "Meat & Fish": ["fresh meats", "chicken", "chickens", "rotisserie chicken", "whole chicken", "beef", "pork", "sausage", "sausages", "bacon", "mince", "ham", "steak", "steaks", "fish", "salmon", "tuna", "prawn", "prawns", "lardons", "chorizo", "pepperoni", "turkey", "burgers", "burger", "breaded chicken", "meat", "lamb"],
        "Bakery": ["bakery", "bread", "breads", "loaf", "sourdough", "bun", "buns", "bagel", "bagels", "wrap", "wraps", "pita", "pittas", "crumpet", "crumpets", "muffin", "muffins", "pastry", "pastries", "croissant", "brioche", "flatbread", "focaccia", "tortilla", "tortillas", "roll", "rolls", "scone", "scones", "panini", "cake", "cakes"],
        "Pantry": ["oil", "olive oil", "jam", "honey", "tinned fruit", "spices", "spice", "stock", "stock cubes", "seasoning", "peanut butter", "sauces", "sauce", "mayonnaise", "mayo", "pickles", "pickle", "rice", "basmati", "pulses", "lentils", "chickpeas", "tinned foods", "pasta", "spaghetti", "gnocchi", "risotto", "soups", "soup", "dried fruits", "seeds", "nuts", "coffee", "cereal", "weetabix", "oats", "granola", "tea", "flour", "sugar", "caster sugar", "brown sugar", "baking goods", "bicarbonate", "cocoa", "choc chips", "chocolate", "vanilla", "yeast", "salt", "peppercorns", "paprika", "turmeric", "mash", "instant mash", "passata", "puree", "tomato puree", "beans", "baked beans", "black beans", "butter beans", "cannelini", "squash", "cordials", "cordial", "juice", "pepsi", "fanta", "biscuits", "sweets", "oreos", "biscoff", "marmite", "chopped tomatoes", "mutti", "polpa", "tahini", "ketchup", "salad cream", "dressing", "vinegar", "balsamic", "glaze", "syrup", "agave", "chutney", "hot sauce"],
        "Household": ["tissues", "toilet roll", "toilet paper", "cleaning", "lightbulbs", "laundry", "pet food", "bird food", "cat food", "dog food", "cleaner", "wipes", "kitchen wipes", "anti bac wipes", "floor wipes", "big wipes", "bags", "bin bags", "kitchen bin bags", "bathroom bin bags", "food bags", "freshener", "air freshener", "foil", "foil tray", "tape", "paper tape", "roll", "kitchen roll", "detergent", "laundry detergent", "fabric conditioner", "tablets", "dishwasher tablets", "dishwasher cleaner", "sponges", "duster", "silicone", "weed killer", "slug pellets", "twine", "paint", "compost", "books", "greeting cards", "cards", "magazines", "papers", "stationery", "dvd", "electronics", "toys", "homeware", "kitchenware", "car care", "clothing", "shoes"],
        "Toiletries": ["haircare", "shampoo", "sun lotion", "beauty", "dental", "toothpaste", "bath", "soap", "medicine", "shaving", "shave gel", "baby", "sanitary", "nappies", "pads", "tampons", "spray", "body spray", "balm", "lip balm", "mouthwash", "deodorant", "gel", "floss", "dental floss", "multivitamins", "vitamin", "hayfever", "hay fever", "serum", "rituals"],
        "Frozen": ["frozen", "frozen fish", "pizza", "frozen veg", "frozen meat", "frozen ready meals", "ice cream", "ice creams", "desserts", "nuii", "ice", "ice cubes", "frozen berries", "frozen spinach", "frozen mushrooms", "fish fingers", "chips", "frozen smoothie"],
        "Free From": ["free from", "gluten free", "gf", "dairy free", "lactose free", "lf"],
        "Beer, Wine & Spirits": ["spirits", "wine", "beer", "cider", "alcohol", "fizzy drinks", "bottled water", "sparkling water", "cider", "rioja", "pimms"]
    };

    items.forEach(item => {
        let placed = false;
        const lower = item.toLowerCase();

        for (const [cat, keywords] of Object.entries(rules)) {
            if (categories.includes(cat)) {
                const matched = keywords.some(kw => lower.includes(kw));
                if (matched) {
                    result[cat].push(item);
                    placed = true;
                    break;
                }
            }
        }

        if (!placed) {
            const miscCat = categories.includes("Miscellaneous") ? "Miscellaneous" : categories[0];
            result[miscCat].push(item);
        }
    });

    return result;
}

// --- AI SORTING ENGINE WITH DIAGNOSTICS & NATIVE JSON MODE ---
window.sortListWithAI = async function() {
    const groqKey = document.getElementById('groqKey').value.trim();
    const geminiKey = document.getElementById('apiKey').value.trim();

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

    const prompt = `You are an expert British supermarket grocery classifier. Categorize these items strictly into ONLY these categories: ${categories.join(', ')}.
    Account for UK brands (e.g., Sainos -> Bakery, Norpak -> Dairy & Chilled, Idahoan -> Pantry).
    You MUST respond with a valid raw JSON object mapping each category to an array of item strings.
    Items to sort: ${JSON.stringify(items)}`;

    let success = false;
    let aiText = "";
    let startTime = Date.now();

    // 1. PRIMARY: Groq (Llama 3.3 70B with Native JSON Mode)
    if (groqKey && !success) {
        try {
            btn.innerText = "⏳ Sorting with Groq (Llama 3)...";
            const res = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${groqKey}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" },
                    temperature: 0.1
                })
            });

            const data = await res.json();
            if (res.status === 200 && data.choices && data.choices[0] && data.choices[0].message) {
                aiText = data.choices[0].message.content;
                success = true;
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                setAIStatus(`✨ Sorted with Groq Llama 3 (${elapsed}s)`, "success");
            } else {
                const errorMsg = data.error ? data.error.message : `HTTP ${res.status}`;
                console.warn("Groq API Error:", errorMsg);
                setAIStatus(`⚠️ Groq failed: ${errorMsg}. Trying Gemini...`, "warning");
            }
        } catch (e) {
            console.warn("Groq network failure:", e);
            setAIStatus("⚠️ Groq Network Error. Trying Gemini...", "warning");
        }
    } else if (!groqKey) {
        console.warn("No Groq Key provided.");
    }

    // 2. SECONDARY: Gemini Flash
    if (geminiKey && !success) {
        try {
            btn.innerText = "⏳ Trying Gemini Flash...";
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await res.json();
            if (res.status === 200 && data.candidates && data.candidates[0]) {
                aiText = data.candidates[0].content.parts[0].text;
                success = true;
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                setAIStatus(`✨ Sorted with Gemini Flash (${elapsed}s)`, "success");
            } else {
                const errorMsg = data.error ? data.error.message : `HTTP ${res.status}`;
                console.warn("Gemini Flash Error:", errorMsg);
            }
        } catch (e) { console.warn("Flash network error:", e); }
    }

    // 3. TERTIARY: Gemini Pro
    if (geminiKey && !success) {
        try {
            btn.innerText = "⏳ Trying Gemini Pro...";
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await res.json();
            if (res.status === 200 && data.candidates && data.candidates[0]) {
                aiText = data.candidates[0].content.parts[0].text;
                success = true;
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                setAIStatus(`✨ Sorted with Gemini Pro (${elapsed}s)`, "success");
            }
        } catch (e) { console.warn("Pro network error:", e); }
    }

    btn.innerText = "✨ Sort Shopping List";
    btn.disabled = false;

    // 4. LOCAL OFFLINE FALLBACK ENGINE
    if (!success) {
        setAIStatus("⚡ Offline Mode: Sorted using Local Dictionary Engine", "warning");
        currentSortedData = runLocalFallbackSort(items);
        renderChecklistUI();
        document.getElementById('outputContainer').classList.remove('hidden');
        document.getElementById('outputContainer').scrollIntoView({ behavior: 'smooth' });
        return;
    }

    try {
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("JSON parse failure.");
        
        currentSortedData = JSON.parse(jsonMatch[0]);
        renderChecklistUI();
        document.getElementById('outputContainer').classList.remove('hidden');
        document.getElementById('outputContainer').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error("AI JSON Error:", error);
        setAIStatus("⚡ AI output error: Falling back to Local Engine", "warning");
        currentSortedData = runLocalFallbackSort(items);
        renderChecklistUI();
        document.getElementById('outputContainer').classList.remove('hidden');
        document.getElementById('outputContainer').scrollIntoView({ behavior: 'smooth' });
    }
}

// --- CHECKLIST UI & LIVE PROGRESS TRACKER ---
function renderChecklistUI() {
    const area = document.getElementById('checklistArea');
    if (!area) return;
    area.innerHTML = '';

    const hideCompleted = document.getElementById('hideCompleted') ? document.getElementById('hideCompleted').checked : false;
    const selectedSupermarket = document.getElementById('supermarketSelect').value;
    const sortOrder = selectedSupermarket === "Default" ? categories : (supermarkets[selectedSupermarket] || categories);

    let totalItems = 0;
    let checkedItems = 0;

    sortOrder.forEach(cat => { if (!currentSortedData[cat]) currentSortedData[cat] = []; });

    sortOrder.forEach(category => {
        const items = currentSortedData[category] || [];
        if (items.length === 0) return;

        let visibleItemsCount = 0;
        let groupHtml = `
            <div class="category-group" id="group-${category.replace(/\s+/g, '-')}">
                <div class="category-header">
                    <h4>${category}</h4>
                    <span class="badge" id="badge-${category.replace(/\s+/g, '-')}">${items.length} items</span>
                </div>
        `;

        items.forEach((itemObj, itemIndex) => {
            let name = typeof itemObj === 'string' ? itemObj : itemObj.name;
            let isChecked = typeof itemObj === 'object' ? itemObj.checked : false;

            totalItems++;
            if (isChecked) checkedItems++;

            if (hideCompleted && isChecked) return;

            visibleItemsCount++;
            groupHtml += `
                <div class="grocery-row ${isChecked ? 'checked' : ''}" id="row-${category}-${itemIndex}">
                    <div class="grocery-left">
                        <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleCheck('${category}', ${itemIndex}, this)">
                        <span>${name}</span>
                    </div>
                    <button class="secondary-btn" onclick="openMoveModal('${category}', ${itemIndex})">Move</button>
                </div>
            `;
        });

        groupHtml += `</div>`;
        if (visibleItemsCount > 0 || !hideCompleted) {
            area.innerHTML += groupHtml;
        }
    });

    const percent = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;
    document.getElementById('progressText').innerText = `${checkedItems} / ${totalItems} Completed (${percent}%)`;
    document.getElementById('progressBar').style.width = `${percent}%`;
}

window.toggleCheck = function(category, itemIndex, checkbox) {
    let item = currentSortedData[category][itemIndex];
    if (typeof item === 'string') {
        currentSortedData[category][itemIndex] = { name: item, checked: checkbox.checked };
    } else {
        item.checked = checkbox.checked;
    }
    renderChecklistUI();
}

window.addQuickItem = function() {
    const input = document.getElementById('quickAddItem');
    const val = input.value.trim();
    if (!val) return;

    const targetCat = categories.includes("Miscellaneous") ? "Miscellaneous" : categories[0];
    if (!currentSortedData[targetCat]) currentSortedData[targetCat] = [];
    currentSortedData[targetCat].push({ name: val, checked: false });

    input.value = '';
    renderChecklistUI();
}

// --- MOVE ITEM TAP-TO-SELECT MODAL ---
window.openMoveModal = function(fromCategory, itemIndex) {
    let itemObj = currentSortedData[fromCategory][itemIndex];
    let itemName = typeof itemObj === 'string' ? itemObj : itemObj.name;
    
    moveContext = { fromCategory, itemIndex, itemObj };

    document.getElementById('moveModalTitle').innerText = `Move "${itemName}"`;
    
    const container = document.getElementById('moveCategoryButtons');
    container.innerHTML = '';

    categories.forEach(cat => {
        if (cat !== fromCategory) {
            container.innerHTML += `<button class="category-btn" onclick="executeMove('${cat}')">${cat}</button>`;
        }
    });

    document.getElementById('moveModal').classList.remove('hidden');
}

window.executeMove = function(targetCategory) {
    if (!moveContext) return;

    const { fromCategory, itemIndex, itemObj } = moveContext;

    currentSortedData[fromCategory].splice(itemIndex, 1);

    if (!currentSortedData[targetCategory]) currentSortedData[targetCategory] = [];
    currentSortedData[targetCategory].push(itemObj);

    closeMoveModal();
    renderChecklistUI();
}

window.closeMoveModal = function() {
    document.getElementById('moveModal').classList.add('hidden');
    moveContext = null;
}

// --- CLEAN KEEP EXPORT (NO BRACKETS) ---
window.copyChecklistForKeep = function(uncheckedOnly = true) {
    let outputText = "";
    const selectedSupermarket = document.getElementById('supermarketSelect').value;
    const sortOrder = selectedSupermarket === "Default" ? categories : (supermarkets[selectedSupermarket] || categories);

    sortOrder.forEach(category => {
        const items = currentSortedData[category] || [];
        
        // Filter items based on user choice
        const filteredItems = items.filter(i => {
            let isChecked = typeof i === 'object' ? i.checked : false;
            return uncheckedOnly ? !isChecked : true;
        });

        if (filteredItems.length > 0) {
            outputText += `--- ${category.toUpperCase()} ---\n`;
            filteredItems.forEach(i => {
                let name = typeof i === 'string' ? i : i.name;
                // Output clean plain lines without [ ] or [x]
                outputText += `${name}\n`;
            });
            outputText += `\n`;
        }
    });

    if (!outputText.trim()) {
        return alert(uncheckedOnly ? "All items are checked off! Nothing to copy." : "List is empty.");
    }

    navigator.clipboard.writeText(outputText.trim()).then(() => {
        alert(uncheckedOnly ? "Unchecked items copied! Paste directly into Keep." : "All items copied!");
    });
}

window.clearShoppingList = function() {
    if (confirm("Clear current shopping list?")) {
        currentSortedData = {};
        document.getElementById('outputContainer').classList.add('hidden');
        document.getElementById('checklistArea').innerHTML = '';
        setAIStatus("", "hidden");
    }
}
