document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const modal = document.getElementById('master-password-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');
    const masterPassInput = document.getElementById('master-password-input');
    const masterPassSubmit = document.getElementById('master-password-submit');
    const modalError = document.getElementById('modal-error');
    const tabs = document.querySelectorAll('.tab-link');
    const contents = document.querySelectorAll('.tab-content');
    const todoInput = document.getElementById('todo-input'), addTodoBtn = document.getElementById('add-todo-btn'), todoList = document.getElementById('todo-list'), micBtn = document.getElementById('mic-btn');
    const passSiteInput = document.getElementById('password-site-input'), passValueInput = document.getElementById('password-value-input'), addPassBtn = document.getElementById('add-password-btn'), passList = document.getElementById('password-list');
    const snippetTitleInput = document.getElementById('snippet-title-input'), snippetCodeInput = document.getElementById('snippet-code-input'), addSnippetBtn = document.getElementById('add-snippet-btn'), snippetList = document.getElementById('snippet-list');

    let masterPassword = null;
    let appData = { todos: [], passwords: [], snippets: [] };

    // --- Encryption ---
    function encrypt(text) { return CryptoJS.AES.encrypt(text, masterPassword).toString(); }
    function decrypt(ciphertext) {
        try { return CryptoJS.AES.decrypt(ciphertext, masterPassword).toString(CryptoJS.enc.Utf8); } 
        catch (e) { return null; }
    }

    // --- Master Password Logic ---
    function showMasterPasswordPrompt(isSettingUp) {
        modal.style.display = 'flex';
        modalTitle.textContent = isSettingUp ? 'Set Master Password' : 'Enter Master Password';
        modalText.textContent = isSettingUp ? 'This protects your data. It cannot be recovered.' : 'Enter password to unlock.';
        masterPassInput.focus();
    }
    masterPassSubmit.onclick = () => {
        const inputPass = masterPassInput.value;
        if (inputPass.length < 4) { modalError.textContent = 'Min 4 characters.'; return; }
        const storedHash = localStorage.getItem('masterPassHash');
        if (storedHash) {
            if (CryptoJS.SHA256(inputPass).toString() === storedHash) {
                masterPassword = inputPass;
                modal.style.display = 'none';
                loadData();
            } else { modalError.textContent = 'Wrong password!'; }
        } else {
            masterPassword = inputPass;
            localStorage.setItem('masterPassHash', CryptoJS.SHA256(inputPass).toString());
            modal.style.display = 'none';
        }
        masterPassInput.value = '';
    };
    if (!localStorage.getItem('masterPassHash')) { showMasterPasswordPrompt(true); }

    // --- Tab Logic ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            contents.forEach(c => c.classList.remove('active'));
            const targetId = tab.dataset.tab;
            if (targetId === 'passwords' && !masterPassword) { 
                showMasterPasswordPrompt(false); 
                return; 
            }
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // --- Data & Rendering Logic ---
    function saveData() {
        if (!masterPassword) return;
        const dataToSave = {
            todos: appData.todos,
            snippets: appData.snippets,
            passwords: appData.passwords.map(p => ({ site: p.site, value: encrypt(p.value) }))
        };
        localStorage.setItem('myPocketDashboardData', JSON.stringify(dataToSave));
    }
    function loadData() {
        if (!masterPassword) return;
        const data = JSON.parse(localStorage.getItem('myPocketDashboardData'));
        if (data) {
            appData.todos = data.todos || [];
            appData.snippets = data.snippets || [];
            appData.passwords = (data.passwords || []).map(p => ({ site: p.site, value: decrypt(p.value) })).filter(p => p.value);
        }
        renderAll();
    }
    function renderAll() {
        todoList.innerHTML = ''; appData.todos.forEach(t => createTodoElement(t.text, t.completed));
        passList.innerHTML = ''; appData.passwords.forEach(p => createPasswordElement(p.site, p.value));
        snippetList.innerHTML = ''; appData.snippets.forEach(s => createSnippetElement(s.title, s.code));
    }
    function copyToClipboard(text, btn) {
        navigator.clipboard.writeText(text).then(() => {
            const original = btn.textContent; btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = original; }, 1500);
        });
    }

    // --- Element Creation Functions ---
    function createTodoElement(text, completed) {
        const li = document.createElement('li');
        li.innerHTML = `<span>${text}</span><div class="item-controls"><button class="control-btn delete-btn">❌</button></div>`;
        if (completed) li.classList.add('completed');
        li.querySelector('span').onclick = () => { li.classList.toggle('completed'); const t = appData.todos.find(td=>td.text===text); if(t)t.completed=li.classList.contains('completed'); saveData(); };
        li.querySelector('.delete-btn').onclick = () => { appData.todos = appData.todos.filter(t => t.text !== text); saveData(); renderAll(); };
        todoList.prepend(li);
    }
    addTodoBtn.onclick = () => { if (todoInput.value.trim() === '') return; appData.todos.push({ text: todoInput.value.trim(), completed: false }); saveData(); renderAll(); todoInput.value = ''; };
    todoInput.onkeypress = e => e.key === 'Enter' && addTodoBtn.click();
    
    function createPasswordElement(site, value) {
        const li = document.createElement('li');
        li.innerHTML = `<div class="password-item-content"><strong>${site}</strong>: <span class="password-dots">••••••••</span></div><div class="item-controls"><button class="control-btn toggle-vis-btn">👁️</button><button class="control-btn copy-btn">📋</button><button class="control-btn delete-btn">❌</button></div>`;
        const dots = li.querySelector('.password-dots'), toggleBtn = li.querySelector('.toggle-vis-btn'); let isVisible = false;
        toggleBtn.onclick = () => { isVisible = !isVisible; dots.textContent = isVisible ? value : '••••••••'; toggleBtn.textContent = isVisible ? '🙈' : '👁️'; };
        li.querySelector('.copy-btn').onclick = e => copyToClipboard(value, e.target);
        li.querySelector('.delete-btn').onclick = () => { appData.passwords = appData.passwords.filter(p => p.site !== site); saveData(); renderAll(); };
        passList.prepend(li);
    }
    addPassBtn.onclick = () => { if (passSiteInput.value.trim() === '' || passValueInput.value.trim() === '') return; appData.passwords.push({ site: passSiteInput.value.trim(), value: passValueInput.value.trim() }); saveData(); renderAll(); passSiteInput.value = ''; passValueInput.value = ''; };

    function createSnippetElement(title, code) {
        const li = document.createElement('li');
        li.innerHTML = `<div class="snippet-item-content"><div class="snippet-title">${title}</div><pre><code></code></pre></div><div class="item-controls"><button class="control-btn copy-btn">📋</button><button class="control-btn delete-btn">❌</button></div>`;
        li.querySelector('code').textContent = code;
        li.querySelector('.copy-btn').onclick = e => copyToClipboard(code, e.target);
        li.querySelector('.delete-btn').onclick = () => { appData.snippets = appData.snippets.filter(s => s.title !== title); saveData(); renderAll(); };
        snippetList.prepend(li);
    }
    addSnippetBtn.onclick = () => { if (snippetTitleInput.value.trim() === '' || snippetCodeInput.value.trim() === '') return; appData.snippets.push({ title: snippetTitleInput.value.trim(), code: snippetCodeInput.value.trim() }); saveData(); renderAll(); snippetTitleInput.value = ''; snippetCodeInput.value = ''; };

    // --- Voice Input ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) { const recognition = new SpeechRecognition(); recognition.lang = 'hi-IN'; micBtn.onclick = () => recognition.start(); recognition.onstart = () => micBtn.textContent = '...'; recognition.onend = () => micBtn.textContent = '🎤'; recognition.onresult = e => todoInput.value = e.results[0][0].transcript; } 
    else { micBtn.style.display = 'none'; }
    
    // --- सर्च फीचर का लॉजिक ---
    function setupSearch(inputId, listId, filterFunction) {
        const searchInput = document.getElementById(inputId);
        searchInput.addEventListener('keyup', () => {
            const searchTerm = searchInput.value.toLowerCase();
            const items = document.querySelectorAll(`#${listId} > li`);
            
            items.forEach(item => {
                if (filterFunction(item, searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }

    setupSearch('todo-search', 'todo-list', (item, term) => {
        const text = item.querySelector('span').textContent.toLowerCase();
        return text.includes(term);
    });
    setupSearch('password-search', 'password-list', (item, term) => {
        const text = item.querySelector('strong').textContent.toLowerCase();
        return text.includes(term);
    });
    setupSearch('snippet-search', 'snippet-list', (item, term) => {
        const text = item.querySelector('.snippet-title').textContent.toLowerCase();
        return text.includes(term);
    });
});