let categories = JSON.parse(localStorage.getItem('categories')) || [
    "Produce", "Dairy & Chilled", "Meat & Fish", "Bakery", "Pantry", "Household", "Toiletries", "Frozen", "Miscellaneous"
];

let supermarkets = JSON.parse(localStorage.getItem('supermarkets')) || {};
let editingSupermarket = null;
let currentSortedData = {};

window.addEventListener('DOMContentLoaded', () => {
    const savedGroq = localStorage.getItem('groq_api_key');
    if (savedGroq) document.getElementById('groqKey').value = savedGroq;

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

// EXPANDED COMPREHENSIVE LOCAL UK SUPERMARKET DICTIONARY
function runLocalFallbackSort(items) {
    let result = {};
    categories.forEach(c => result[c] = []);
    
    const rules = {
        "Produce": [
            "apple", "apples", "banana", "bananas", "avo", "avos", "avocado", "avocadoes", "avocados", 
            "lemon", "lemons", "lime", "limes", "strawberry", "strawberries", "strawbs", "blueberry", "blueberries", 
            "raspberry", "raspberries", "peach", "peaches", "pomegranate", "cherry", "cherries", "mango", "fruit", 
            "tomato", "tomatoes", "datterino", "onion", "onions", "garlic", "potato", "potatoes", "spud", "spuds", 
            "carrot", "carrots", "salad", "rocket", "lettuce", "cucumber", "courgette", "courgettes", "pepper", 
            "peppers", "mushroom", "mushrooms", "spinach", "bean", "beans", "runner beans", "green beans", 
            "stringless beans", "cabbage", "leek", "leeks", "asparagus", "herb", "herbs", "basil", "chive", "chives", 
            "mint", "sweet potato", "sweet potatoes", "aubergine", "spring onion", "spring onions", "corn", 
            "celery", "rotisserie chicken", "cooked chicken", "cured meats", "quiche", "hummus", "dip", "dips"
        ],
        "Dairy & Chilled": [
            "milk", "milks", "lf milk", "oat milk", "dairy", "cheese", "cheeses", "cheddar", "mozzarella", "parmesan", 
            "parmigiano", "feta", "burrata", "halloumi", "cottage cheese", "cream cheese", "mascarpone", "sour cream", 
            "creme fraiche", "whipping cream", "double cream", "clotted cream", "elmlea", "butter", "norpak", "margarine", 
            "egg", "eggs", "yoghurt", "yogurt", "kefir", "pudding", "custard", "ready meal", "lasagne sheets", 
            "shortcrust pastry", "garlic bread", "guacamole", "perinnaise"
        ],
        "Meat & Fish": [
            "chicken", "chickens", "beef", "pork", "sausage", "sausages", "bacon", "mince", "ham", "steak", 
            "steaks", "fish", "salmon", "tuna", "prawn", "prawns", "lardons", "chorizo", "pepperoni", "turkey", 
            "burgers", "burger", "breaded chicken", "meat", "lamb"
        ],
        "Bakery": [
            "bread", "breads", "loaf", "sourdough", "bun", "buns", "bagel", "bagels", "wrap", "wraps", "pita", 
            "pittas", "crumpet", "crumpets", "muffin", "muffins", "pastry", "pastries", "croissant", "brioche", 
            "flatbread", "focaccia", "tortilla", "tortillas", "roll", "rolls", "scone", "scones", "panini"
        ],
        "Pantry": [
            "oil", "olive oil", "ketchup", "paste", "chipotle", "chipotle paste", "sauce", "sauces", "pesto", 
            "mayo", "mayonnaise", "salad cream", "dressing", "vinegar", "balsamic", "glaze", "syrup", "honey", 
            "agave", "chutney", "hot sauce", "passata", "puree", "tomato puree", "beans", "baked beans", "black beans", 
            "butter beans", "cannelini", "pulses", "lentils", "chickpeas", "rice", "basmati", "spaghetti", "pasta", 
            "gnocchi", "risotto", "noodles", "cereal", "weetabix", "oats", "granola", "flour", "sugar", "caster sugar", 
            "brown sugar", "bicarbonate", "cocoa", "choc chips", "chocolate", "vanilla", "yeast", "salt", "peppercorns", 
            "paprika", "turmeric", "spices", "seasoning", "stock", "stock cubes", "mash", "instant mash", "coffee", 
            "tea", "hot chocolate", "squash", "cordial", "juice", "pepsi", "fanta", "cider", "wine", "rioja", "crisps", 
            "sweets", "biscuits", "oreos", "biscoff", "jam", "marmite", "tinned fruit", "chopped tomatoes", "mutti", "polpa"
        ],
        "Household": [
            "cleaner", "cleaning", "wipes", "kitchen wipes", "anti bac wipes", "floor wipes", "big wipes", 
            "bags", "bin bags", "kitchen bin bags", "bathroom bin bags", "food bags", "freshener", "air freshener", 
            "foil", "foil tray", "tape", "paper tape", "roll", "kitchen roll", "toilet roll", "toilet paper", 
            "detergent", "laundry detergent", "fabric conditioner", "tablets", "dishwasher tablets", "dishwasher cleaner", 
            "sponges", "duster", "silicone", "weed killer", "slug pellets", "twine", "paint", "compost"
        ],
        "Toiletries": [
            "spray", "body spray", "balm", "lip balm", "mouthwash", "toothpaste", "deodorant", "gel", "shave gel", 
            "floss", "dental floss", "shampoo", "soap", "multivitamins", "vitamin", "hayfever", "hay fever", 
            "tablets", "serum", "rituals"
        ],
        "Frozen": [
            "ice cream", "ice creams", "nuii", "frozen", "ice", "ice cubes", "frozen berries", "frozen spinach", 
            "frozen mushrooms", "frozen fish", "fish fingers", "chips", "frozen smoothie"
        ]
    };

    items.forEach(item => {
        let placed = false;
        const lower = item.toLowerCase();

        for (const [cat, keywords] of Object.entries(rules)) {
            if (categories.includes(cat)) {
                // Exact match check or boundary check to prevent misclassifications
                const matched = keywords.some(kw => {
                    const regex = new RegExp(`\\b${kw}\\b`, 'i');
                    return regex.test(lower);
                });

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

// AI Sorting with Chain: Groq -> Gemini Flash -> Gemini Pro -> Enhanced Local Backup
async function sortListWithAI() {
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

    const prompt = `You are an expert British supermarket grocery classifier. Categorize the items strictly into ONLY these categories: ${categories.join(', ')}.
    Apply realistic UK grocery logic (e.g., Cheddar -> Dairy & Chilled, Foil tray -> Household, Chipotle paste -> Pantry, Boots spray -> Toiletries).
    Return ONLY a raw JSON object where keys are category names and values are arrays of string items. No markdown.
    List to sort: ${JSON.stringify(items)}`;

    let success = false;
    let aiText = "";

    // 1. PRIMARY: Groq (Llama 3.3 70B)
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
                    temperature: 0.1
                })
            });
            const data = await res.json();
            if (data.choices && data.choices[0] && data.choices[0].message) {
                aiText = data.choices[0].message.content;
                success = true;
            }
        } catch (e) { console.warn("Groq failed:", e); }
    }

    // 2. SECONDARY: Gemini Flash
    if (geminiKey && !success) {
        try {
            btn.innerText = "⏳ Groq busy. Trying Gemini Flash...";
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await res.json();
            if (data.candidates && data.candidates[0]) {
                aiText = data.candidates[0].content.parts[0].text;
                success = true;
            }
        } catch (e) { console.warn("Flash failed:", e); }
    }

    // 3. TERTIARY: Gemini Pro
    if (geminiKey && !success) {
        try {
            btn.innerText = "⏳ Trying Gemini Pro backup...";
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await res.json();
            if (data.candidates && data.candidates[0]) {
                aiText = data.candidates[0].content.parts[0].text;
                success = true;
            }
        } catch (e) { console.warn("Pro failed:", e); }
    }

    btn.innerText = "✨ Sort Shopping List";
    btn.disabled = false;

    // 4. LOCAL OFFLINE ENGINE
    if (!success) {
        console.warn("All AI servers busy. Running local dictionary engine.");
        currentSortedData = runLocalFallbackSort(items);
        renderChecklistUI();
        document.getElementById('outputContainer').classList.remove('hidden');
        document.getElementById('outputContainer').scrollIntoView({ behavior: 'smooth' });
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
        currentSortedData = runLocalFallbackSort(items);
        renderChecklistUI();
        document.getElementById('outputContainer').classList.remove('hidden');
        document.getElementById('outputContainer').scrollIntoView({ behavior: 'smooth' });
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
                   
