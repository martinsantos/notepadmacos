// ============ CONFIGURATION ============
const AUTOSAVE_INTERVAL = 60000;
const HISTORY_SAVE_INTERVAL = 30000;
const MAX_HISTORY_PER_TAB = 100;
const STORAGE_KEY = 'notepad_session';
const HISTORY_KEY = 'notepad_history';

// ============ STATE ============
let tabs = [];
let activeTabId = null;
let tabCounter = 0;
let history = {};
let selectedHistoryIndex = null;
let recentFiles = [];
let pinnedFiles = [];
let activeMenu = null;

const tabsContainer = document.getElementById('tabs-container');
const editorContainer = document.getElementById('editor-container');

// ============ MENU SYSTEM ============
function initMenu() {
    // Menu items click handling
    document.querySelectorAll('.menu-item').forEach(item => {
        item.querySelector('.menu-label').addEventListener('click', (e) => {
            e.stopPropagation();
            const menuName = item.dataset.menu;

            if (activeMenu === menuName) {
                closeAllMenus();
            } else {
                closeAllMenus();
                item.classList.add('active');
                activeMenu = menuName;
            }
        });

        // Hover to switch menus when one is open
        item.addEventListener('mouseenter', () => {
            if (activeMenu && activeMenu !== item.dataset.menu) {
                closeAllMenus();
                item.classList.add('active');
                activeMenu = item.dataset.menu;
            }
        });
    });

    // Menu options click handling
    document.querySelectorAll('.menu-option[data-action]').forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = option.dataset.action;
            handleMenuAction(action);
            closeAllMenus();
        });
    });

    // Close menus when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.menu-bar')) {
            closeAllMenus();
        }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllMenus();
        }
    });
}

function closeAllMenus() {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    activeMenu = null;
}

function handleMenuAction(action) {
    const tab = getActiveTab();
    const editor = getActiveEditor();

    switch (action) {
        case 'new':
            tabs.forEach(t => closeTab(t.id));
            newTab();
            break;
        case 'new-tab':
            newTab();
            break;
        case 'open':
            window.electronAPI?.openFileDialog();
            break;
        case 'save':
            saveFile();
            break;
        case 'save-as':
            saveFileAs();
            break;
        case 'pin-current':
            pinCurrentFile();
            break;
        case 'show-in-folder':
            if (tab?.filePath) {
                window.electronAPI?.showInFolder(tab.filePath);
            } else {
                showToast('Guarda el archivo primero');
            }
            break;
        case 'close-tab':
            closeTab(activeTabId);
            break;
        case 'undo':
            document.execCommand('undo');
            break;
        case 'redo':
            document.execCommand('redo');
            break;
        case 'cut':
            document.execCommand('cut');
            break;
        case 'copy':
            document.execCommand('copy');
            break;
        case 'paste':
            document.execCommand('paste');
            break;
        case 'select-all':
            if (editor) {
                editor.select();
            }
            break;
        case 'find':
            findText();
            break;
        case 'replace':
            replaceText();
            break;
        case 'show-history':
            showHistory();
            break;
        case 'export-history':
            exportHistory();
            break;
        case 'clear-history':
            clearHistory();
            break;
    }
}

async function pinCurrentFile() {
    const tab = getActiveTab();
    if (tab && tab.filePath) {
        await window.electronAPI?.pinFile(tab.filePath);
        showToast(`📌 "${tab.fileName}" fijado`);
    } else {
        showToast('Guarda el archivo primero para poder fijarlo');
    }
}

function updateMenuLists(data) {
    recentFiles = data.recentFiles || [];
    pinnedFiles = data.pinnedFiles || [];

    // Update pinned submenu
    const pinnedSubmenu = document.getElementById('pinned-submenu');
    if (pinnedFiles.length === 0) {
        pinnedSubmenu.innerHTML = '<div class="menu-empty">No hay archivos fijados</div>';
    } else {
        pinnedSubmenu.innerHTML = pinnedFiles.map(file => `
            <div class="menu-file-item" data-path="${escapeHtml(file.path)}">
                <span class="pin-icon">📌</span>
                <span class="file-name">${escapeHtml(file.name)}</span>
                <span class="unpin-btn" data-unpin="${escapeHtml(file.path)}" title="Desfijar">×</span>
            </div>
        `).join('');

        // Add click handlers
        pinnedSubmenu.querySelectorAll('.menu-file-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('unpin-btn')) {
                    window.electronAPI?.openFile(item.dataset.path);
                    closeAllMenus();
                }
            });
        });

        pinnedSubmenu.querySelectorAll('.unpin-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await window.electronAPI?.unpinFile(btn.dataset.unpin);
                showToast('Archivo desfijado');
            });
        });
    }

    // Update recent submenu
    const recentSubmenu = document.getElementById('recent-submenu');
    if (recentFiles.length === 0) {
        recentSubmenu.innerHTML = '<div class="menu-empty">No hay archivos recientes</div>';
    } else {
        const recentHtml = recentFiles.map(file => {
            const isPinned = pinnedFiles.some(p => p.path === file.path);
            return `
                <div class="menu-file-item" data-path="${escapeHtml(file.path)}">
                    ${isPinned ? '<span class="pin-icon">📌</span>' : ''}
                    <span class="file-name">${escapeHtml(file.name)}</span>
                </div>
            `;
        }).join('');

        recentSubmenu.innerHTML = recentHtml + `
            <div class="menu-separator"></div>
            <div class="menu-option menu-clear-recent" data-action="clear-recent">Limpiar recientes</div>
        `;

        // Add click handlers for files
        recentSubmenu.querySelectorAll('.menu-file-item').forEach(item => {
            item.addEventListener('click', () => {
                window.electronAPI?.openFile(item.dataset.path);
                closeAllMenus();
            });
        });

        // Clear recent handler
        recentSubmenu.querySelector('.menu-clear-recent')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            await window.electronAPI?.clearRecentFiles();
            showToast('Recientes limpiados');
            closeAllMenus();
        });
    }
}

// ============ PERSISTENCE ============
function saveSession() {
    const session = {
        tabs: tabs.map(t => ({
            id: t.id,
            fileName: t.fileName,
            filePath: t.filePath,
            content: t.content,
            originalContent: t.originalContent,
            isModified: t.isModified
        })),
        activeTabId: activeTabId,
        tabCounter: tabCounter
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    updateAutosaveStatus();
}

function loadSession() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const session = JSON.parse(saved);
            tabCounter = session.tabCounter || 0;

            if (session.tabs && session.tabs.length > 0) {
                session.tabs.forEach(t => createTabFromData(t));
                if (session.activeTabId) {
                    switchTab(session.activeTabId);
                }
                return true;
            }
        }
    } catch (e) {
        console.error('Error loading session:', e);
    }
    return false;
}

function saveHistory() {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function loadHistory() {
    try {
        const saved = localStorage.getItem(HISTORY_KEY);
        if (saved) {
            history = JSON.parse(saved);
        }
    } catch (e) {
        history = {};
    }
}

function addToHistory(tabId, content, fileName) {
    if (!history[tabId]) {
        history[tabId] = [];
    }

    const lastEntry = history[tabId][0];
    if (lastEntry && lastEntry.content === content) {
        return;
    }

    history[tabId].unshift({
        timestamp: Date.now(),
        content: content,
        fileName: fileName
    });

    if (history[tabId].length > MAX_HISTORY_PER_TAB) {
        history[tabId] = history[tabId].slice(0, MAX_HISTORY_PER_TAB);
    }

    saveHistory();
}

// ============ TAB MANAGEMENT ============
function createTabFromData(data) {
    const tabId = data.id;

    const tab = {
        id: tabId,
        fileName: data.fileName,
        filePath: data.filePath || null,
        content: data.content,
        originalContent: data.originalContent || data.content,
        isModified: data.isModified || false
    };

    tabs.push(tab);

    const tabEl = document.createElement('div');
    tabEl.className = 'tab' + (tab.isModified ? ' modified' : '');
    tabEl.dataset.tabId = tabId;
    tabEl.innerHTML = `
        <span class="tab-modified">●</span>
        <span class="tab-title">${escapeHtml(data.fileName)}</span>
        <span class="tab-close">×</span>
    `;
    tabEl.querySelector('.tab-close').onclick = (e) => {
        e.stopPropagation();
        closeTab(tabId);
    };
    tabEl.onclick = () => switchTab(tabId);
    tabsContainer.appendChild(tabEl);

    const editorEl = document.createElement('textarea');
    editorEl.className = 'editor';
    editorEl.dataset.tabId = tabId;
    editorEl.placeholder = 'Escribe aquí...';
    editorEl.value = data.content;
    editorEl.addEventListener('input', () => handleEditorInput(tabId, editorEl));
    editorContainer.appendChild(editorEl);

    return tabId;
}

function newTab(fileName = 'Sin título', content = '', filePath = null) {
    const tabId = ++tabCounter;

    const tab = {
        id: tabId,
        fileName: fileName,
        filePath: filePath,
        content: content,
        originalContent: content,
        isModified: false
    };

    tabs.push(tab);

    const tabEl = document.createElement('div');
    tabEl.className = 'tab';
    tabEl.dataset.tabId = tabId;
    tabEl.innerHTML = `
        <span class="tab-modified">●</span>
        <span class="tab-title">${escapeHtml(fileName)}</span>
        <span class="tab-close">×</span>
    `;
    tabEl.querySelector('.tab-close').onclick = (e) => {
        e.stopPropagation();
        closeTab(tabId);
    };
    tabEl.onclick = () => switchTab(tabId);
    tabsContainer.appendChild(tabEl);

    const editorEl = document.createElement('textarea');
    editorEl.className = 'editor';
    editorEl.dataset.tabId = tabId;
    editorEl.placeholder = 'Escribe aquí...';
    editorEl.value = content;
    editorEl.addEventListener('input', () => handleEditorInput(tabId, editorEl));
    editorContainer.appendChild(editorEl);

    if (content) {
        addToHistory(tabId, content, fileName);
    }

    switchTab(tabId);
    saveSession();
    return tabId;
}

function handleEditorInput(tabId, editorEl) {
    const t = getTab(tabId);
    if (t) {
        t.content = editorEl.value;
        t.isModified = editorEl.value !== t.originalContent;
        updateTabUI(tabId);
        if (tabId === activeTabId) {
            updateCounts();
            updateModifiedIndicator();
        }
        saveSession();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getTab(tabId) {
    return tabs.find(t => t.id === tabId);
}

function getActiveTab() {
    return getTab(activeTabId);
}

function getActiveEditor() {
    return document.querySelector(`.editor[data-tab-id="${activeTabId}"]`);
}

function switchTab(tabId) {
    activeTabId = tabId;

    document.querySelectorAll('.tab').forEach(t => {
        t.classList.toggle('active', parseInt(t.dataset.tabId) === tabId);
    });

    document.querySelectorAll('.editor').forEach(e => {
        e.classList.toggle('active', parseInt(e.dataset.tabId) === tabId);
    });

    const editor = getActiveEditor();
    if (editor) {
        editor.focus();
    }

    updateCounts();
    updateModifiedIndicator();
    updateTitle();
    saveSession();
}

function updateTabUI(tabId) {
    const tab = getTab(tabId);
    const tabEl = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    if (tab && tabEl) {
        tabEl.classList.toggle('modified', tab.isModified);
        tabEl.querySelector('.tab-title').textContent = tab.fileName;
    }
}

function closeTab(tabId) {
    const tab = getTab(tabId);
    if (!tab) return;

    if (tab.isModified) {
        if (!confirm(`¿Cerrar "${tab.fileName}" sin guardar los cambios?`)) {
            return;
        }
    }

    tabs = tabs.filter(t => t.id !== tabId);
    document.querySelector(`.tab[data-tab-id="${tabId}"]`)?.remove();
    document.querySelector(`.editor[data-tab-id="${tabId}"]`)?.remove();

    if (tabs.length === 0) {
        newTab();
    } else if (activeTabId === tabId) {
        switchTab(tabs[tabs.length - 1].id);
    }

    saveSession();
}

// ============ UI UPDATES ============
function updateCounts() {
    const editor = getActiveEditor();
    const text = editor ? editor.value : '';
    const lines = text.split('\n').length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;

    document.getElementById('line-count').textContent = lines;
    document.getElementById('word-count').textContent = words;
    document.getElementById('char-count').textContent = chars;
}

function updateModifiedIndicator() {
    const tab = getActiveTab();
    const indicator = document.getElementById('modified');
    indicator.classList.toggle('visible', tab?.isModified || false);
}

function updateTitle() {
    const tab = getActiveTab();
    if (tab) {
        const prefix = tab.isModified ? '● ' : '';
        document.title = `${prefix}${tab.fileName} - Notepad`;
    }
}

function updateAutosaveStatus() {
    const el = document.getElementById('autosave-status');
    const now = new Date();
    el.textContent = `✓ Guardado ${now.toLocaleTimeString('es', {hour: '2-digit', minute: '2-digit'})}`;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2000);
}

// ============ FILE OPERATIONS ============
async function saveFile() {
    const tab = getActiveTab();
    if (!tab) return;

    addToHistory(tab.id, tab.content, tab.fileName);

    if (tab.filePath) {
        const result = await window.electronAPI.saveFile({
            path: tab.filePath,
            content: tab.content
        });

        if (result.success) {
            tab.originalContent = tab.content;
            tab.isModified = false;
            updateTabUI(tab.id);
            updateModifiedIndicator();
            updateTitle();
            saveSession();
            showToast('Archivo guardado');
        } else {
            showToast('Error: ' + result.error);
        }
    } else {
        saveFileAs();
    }
}

async function saveFileAs() {
    const tab = getActiveTab();
    if (!tab) return;

    const filePath = await window.electronAPI.getSavePath();
    if (filePath) {
        tab.filePath = filePath;
        tab.fileName = filePath.split('/').pop();

        const result = await window.electronAPI.saveFile({
            path: filePath,
            content: tab.content
        });

        if (result.success) {
            tab.originalContent = tab.content;
            tab.isModified = false;
            updateTabUI(tab.id);
            updateModifiedIndicator();
            updateTitle();
            saveSession();
            showToast('Archivo guardado');
        }
    }
}

// ============ EDIT OPERATIONS ============
function findText() {
    const editor = getActiveEditor();
    if (!editor) return;
    const searchTerm = prompt('Buscar:');
    if (searchTerm) {
        const index = editor.value.indexOf(searchTerm, editor.selectionEnd);
        if (index !== -1) {
            editor.focus();
            editor.selectionStart = index;
            editor.selectionEnd = index + searchTerm.length;
        } else {
            const indexFromStart = editor.value.indexOf(searchTerm);
            if (indexFromStart !== -1) {
                editor.focus();
                editor.selectionStart = indexFromStart;
                editor.selectionEnd = indexFromStart + searchTerm.length;
            } else {
                showToast('No se encontró el texto');
            }
        }
    }
}

function replaceText() {
    const editor = getActiveEditor();
    if (!editor) return;
    const searchTerm = prompt('Buscar:');
    if (searchTerm) {
        const replaceTerm = prompt('Reemplazar con:');
        if (replaceTerm !== null) {
            editor.value = editor.value.replaceAll(searchTerm, replaceTerm);
            editor.dispatchEvent(new Event('input'));
            showToast('Reemplazo completado');
        }
    }
}

// ============ HISTORY ============
function showHistory() {
    const tab = getActiveTab();
    if (!tab) return;

    const panel = document.getElementById('history-panel');
    const list = document.getElementById('history-list');

    const tabHistory = history[tab.id] || [];

    if (tabHistory.length === 0) {
        list.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No hay historial para este archivo</div>';
    } else {
        list.innerHTML = tabHistory.map((entry, index) => {
            const date = new Date(entry.timestamp);
            const timeStr = date.toLocaleString('es', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            const preview = entry.content.substring(0, 100).replace(/\n/g, ' ');
            return `
                <div class="history-item" data-index="${index}">
                    <div class="history-time">${timeStr}</div>
                    <div class="history-preview">${escapeHtml(preview)}...</div>
                </div>
            `;
        }).join('');

        // Add click handlers
        list.querySelectorAll('.history-item').forEach(item => {
            item.onclick = () => selectHistoryItem(parseInt(item.dataset.index));
        });
    }

    selectedHistoryIndex = null;
    panel.classList.add('visible');
}

function hideHistory() {
    document.getElementById('history-panel').classList.remove('visible');
    selectedHistoryIndex = null;
}

function selectHistoryItem(index) {
    selectedHistoryIndex = index;
    document.querySelectorAll('.history-item').forEach((item, i) => {
        item.classList.toggle('selected', i === index);
    });
}

function restoreSelected() {
    if (selectedHistoryIndex === null) {
        showToast('Selecciona una versión para restaurar');
        return;
    }

    const tab = getActiveTab();
    const editor = getActiveEditor();
    if (!tab || !editor) return;

    const tabHistory = history[tab.id] || [];
    const entry = tabHistory[selectedHistoryIndex];

    if (entry) {
        addToHistory(tab.id, tab.content, tab.fileName);

        editor.value = entry.content;
        tab.content = entry.content;
        tab.isModified = entry.content !== tab.originalContent;
        updateTabUI(tab.id);
        updateCounts();
        updateModifiedIndicator();
        saveSession();

        hideHistory();
        showToast('Versión restaurada');
    }
}

function exportHistory() {
    const tab = getActiveTab();
    if (!tab) return;

    const tabHistory = history[tab.id] || [];
    if (tabHistory.length === 0) {
        showToast('No hay historial para exportar');
        return;
    }

    const exportData = tabHistory.map(entry => {
        const date = new Date(entry.timestamp);
        return `\n${'='.repeat(60)}\n📅 ${date.toLocaleString('es')}\n${'='.repeat(60)}\n\n${entry.content}`;
    }).join('\n');

    const blob = new Blob([`Historial de: ${tab.fileName}\nExportado: ${new Date().toLocaleString('es')}\n${exportData}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial_${tab.fileName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Historial exportado');
}

function clearHistory() {
    const tab = getActiveTab();
    if (!tab) return;

    if (confirm('¿Eliminar todo el historial de este archivo?')) {
        history[tab.id] = [];
        saveHistory();
        showToast('Historial eliminado');
    }
}

// ============ AUTOSAVE ============
function autoSaveToHistory() {
    tabs.forEach(tab => {
        if (tab.content && tab.content.trim()) {
            addToHistory(tab.id, tab.content, tab.fileName);
        }
    });
}

setInterval(() => saveSession(), AUTOSAVE_INTERVAL);
setInterval(() => autoSaveToHistory(), HISTORY_SAVE_INTERVAL);

// ============ ELECTRON IPC ============
if (window.electronAPI) {
    // File opened from main process
    window.electronAPI.onFileOpened((data) => {
        newTab(data.name, data.content, data.path);
    });

    // Save file path received
    window.electronAPI.onSaveFilePath((filePath) => {
        const tab = getActiveTab();
        if (tab) {
            tab.filePath = filePath;
            tab.fileName = filePath.split('/').pop();
            saveFile();
        }
    });

    // Menu data updates (pinned/recent files)
    window.electronAPI.onMenuDataUpdated((data) => {
        updateMenuLists(data);
    });
}

// ============ KEYBOARD SHORTCUTS ============
document.addEventListener('keydown', (e) => {
    // Check for Cmd key (metaKey on Mac)
    if (e.metaKey) {
        switch (e.key.toLowerCase()) {
            case 'n':
                e.preventDefault();
                if (e.shiftKey) {
                    // Cmd+Shift+N: New window (not implemented)
                } else {
                    tabs.forEach(t => closeTab(t.id));
                    newTab();
                }
                break;
            case 't':
                e.preventDefault();
                newTab();
                break;
            case 'o':
                e.preventDefault();
                window.electronAPI?.openFileDialog();
                break;
            case 'g':
                e.preventDefault();
                if (e.shiftKey) {
                    saveFileAs();
                } else {
                    saveFile();
                }
                break;
            case 'w':
                e.preventDefault();
                closeTab(activeTabId);
                break;
            case 'f':
                e.preventDefault();
                findText();
                break;
            case 'h':
                e.preventDefault();
                replaceText();
                break;
            case 'y':
                e.preventDefault();
                showHistory();
                break;
        }
    }
});

// ============ EVENT LISTENERS ============
document.getElementById('new-tab-btn').onclick = () => newTab();
document.getElementById('history-close').onclick = hideHistory;
document.getElementById('history-cancel').onclick = hideHistory;
document.getElementById('history-restore').onclick = restoreSelected;

// ============ INIT ============
loadHistory();
if (!loadSession()) {
    newTab();
}
updateAutosaveStatus();
initMenu();

// Load initial menu data
if (window.electronAPI) {
    Promise.all([
        window.electronAPI.getRecentFiles(),
        window.electronAPI.getPinnedFiles()
    ]).then(([recent, pinned]) => {
        updateMenuLists({ recentFiles: recent, pinnedFiles: pinned });
    });
}
