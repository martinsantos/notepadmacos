const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // File operations
    saveFile: (data) => ipcRenderer.invoke('save-file', data),
    getSavePath: () => ipcRenderer.invoke('get-save-path'),
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
    openFile: (path) => ipcRenderer.invoke('open-file', path),

    // Recent and Pinned files
    getRecentFiles: () => ipcRenderer.invoke('get-recent-files'),
    getPinnedFiles: () => ipcRenderer.invoke('get-pinned-files'),
    pinFile: (path) => ipcRenderer.invoke('pin-file', path),
    unpinFile: (path) => ipcRenderer.invoke('unpin-file', path),
    isPinned: (path) => ipcRenderer.invoke('is-pinned', path),
    clearRecentFiles: () => ipcRenderer.invoke('clear-recent-files'),

    // Finder
    showInFolder: (path) => ipcRenderer.invoke('show-in-folder', path),

    // Menu events (legacy - for keyboard shortcuts)
    onMenuNew: (callback) => ipcRenderer.on('menu-new', callback),
    onMenuNewTab: (callback) => ipcRenderer.on('menu-new-tab', callback),
    onMenuSave: (callback) => ipcRenderer.on('menu-save', callback),
    onMenuCloseTab: (callback) => ipcRenderer.on('menu-close-tab', callback),
    onMenuFind: (callback) => ipcRenderer.on('menu-find', callback),
    onMenuReplace: (callback) => ipcRenderer.on('menu-replace', callback),
    onMenuHistory: (callback) => ipcRenderer.on('menu-history', callback),
    onMenuExportHistory: (callback) => ipcRenderer.on('menu-export-history', callback),
    onMenuClearHistory: (callback) => ipcRenderer.on('menu-clear-history', callback),
    onMenuPinCurrent: (callback) => ipcRenderer.on('menu-pin-current', callback),

    // File opened from main process
    onFileOpened: (callback) => ipcRenderer.on('file-opened', (event, data) => callback(data)),
    onSaveFilePath: (callback) => ipcRenderer.on('save-file-path', (event, path) => callback(path)),

    // Menu data updates (recent/pinned files changed)
    onMenuDataUpdated: (callback) => ipcRenderer.on('menu-data-updated', (event, data) => callback(data))
});
