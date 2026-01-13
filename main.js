const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Store paths
const USER_DATA_PATH = app.getPath('userData');
const RECENT_FILES_PATH = path.join(USER_DATA_PATH, 'recent-files.json');
const PINNED_FILES_PATH = path.join(USER_DATA_PATH, 'pinned-files.json');
const MAX_RECENT_FILES = 30;

let mainWindow;
let recentFiles = [];
let pinnedFiles = [];

// ============ PINNED FILES ============
function loadPinnedFiles() {
    try {
        if (fs.existsSync(PINNED_FILES_PATH)) {
            pinnedFiles = JSON.parse(fs.readFileSync(PINNED_FILES_PATH, 'utf8'));
        }
    } catch (e) {
        pinnedFiles = [];
    }
}

function savePinnedFiles() {
    try {
        fs.writeFileSync(PINNED_FILES_PATH, JSON.stringify(pinnedFiles, null, 2));
    } catch (e) {
        console.error('Error saving pinned files:', e);
    }
}

function addToPinnedFiles(filePath) {
    if (pinnedFiles.find(f => f.path === filePath)) return;

    pinnedFiles.push({
        path: filePath,
        name: path.basename(filePath),
        timestamp: Date.now()
    });

    savePinnedFiles();
    sendMenuData();
}

function removeFromPinnedFiles(filePath) {
    pinnedFiles = pinnedFiles.filter(f => f.path !== filePath);
    savePinnedFiles();
    sendMenuData();
}

function isPinned(filePath) {
    return pinnedFiles.some(f => f.path === filePath);
}

// ============ RECENT FILES ============
function loadRecentFiles() {
    try {
        if (fs.existsSync(RECENT_FILES_PATH)) {
            recentFiles = JSON.parse(fs.readFileSync(RECENT_FILES_PATH, 'utf8'));
        }
    } catch (e) {
        recentFiles = [];
    }
}

function saveRecentFiles() {
    try {
        fs.writeFileSync(RECENT_FILES_PATH, JSON.stringify(recentFiles, null, 2));
    } catch (e) {
        console.error('Error saving recent files:', e);
    }
}

function addToRecentFiles(filePath) {
    recentFiles = recentFiles.filter(f => f.path !== filePath);

    recentFiles.unshift({
        path: filePath,
        name: path.basename(filePath),
        timestamp: Date.now()
    });

    if (recentFiles.length > MAX_RECENT_FILES) {
        recentFiles = recentFiles.slice(0, MAX_RECENT_FILES);
    }

    saveRecentFiles();
    sendMenuData();

    // macOS dock recent documents
    app.addRecentDocument(filePath);
}

function clearRecentFiles() {
    recentFiles = [];
    saveRecentFiles();
    app.clearRecentDocuments();
    sendMenuData();
}

// Send menu data to renderer
function sendMenuData() {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('menu-data-updated', {
            recentFiles: recentFiles,
            pinnedFiles: pinnedFiles
        });
    }
}

// ============ FILE OPERATIONS ============
async function openFileDialog() {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: [
            { name: 'Archivos de texto', extensions: ['txt', 'md', 'json', 'js', 'html', 'css', 'py', 'sh', 'log'] },
            { name: 'Todos los archivos', extensions: ['*'] }
        ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
        for (const filePath of result.filePaths) {
            openFile(filePath);
        }
    }
}

async function openFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            dialog.showErrorBox('Error', `El archivo no existe: ${filePath}`);
            return;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const fileName = path.basename(filePath);

        mainWindow?.webContents.send('file-opened', {
            path: filePath,
            name: fileName,
            content: content
        });

        addToRecentFiles(filePath);
    } catch (e) {
        dialog.showErrorBox('Error', `No se pudo abrir el archivo: ${e.message}`);
    }
}

async function saveFileDialog() {
    const result = await dialog.showSaveDialog(mainWindow, {
        filters: [
            { name: 'Archivo de texto', extensions: ['txt'] },
            { name: 'Todos los archivos', extensions: ['*'] }
        ]
    });

    if (!result.canceled && result.filePath) {
        return result.filePath;
    }
    return null;
}

// ============ WINDOW ============
function createWindow() {
    console.log('Creating window...');

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 600,
        minHeight: 400,
        titleBarStyle: 'hidden',
        trafficLightPosition: { x: 15, y: 10 },
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // Remove the application menu (we'll use in-window menu)
    Menu.setApplicationMenu(null);

    const htmlPath = path.join(__dirname, 'renderer.html');
    mainWindow.loadFile(htmlPath);

    mainWindow.once('ready-to-show', () => {
        console.log('Window ready to show');
        mainWindow.show();
        // Send initial menu data
        sendMenuData();
    });

    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Failed to load:', errorCode, errorDescription);
    });
}

// ============ IPC HANDLERS ============
ipcMain.handle('save-file', async (event, { path: filePath, content }) => {
    try {
        fs.writeFileSync(filePath, content, 'utf8');
        addToRecentFiles(filePath);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('get-save-path', async () => {
    return await saveFileDialog();
});

ipcMain.handle('open-file-dialog', async () => {
    await openFileDialog();
});

ipcMain.handle('open-file', async (event, filePath) => {
    await openFile(filePath);
});

ipcMain.handle('get-recent-files', () => recentFiles);
ipcMain.handle('get-pinned-files', () => pinnedFiles);

ipcMain.handle('pin-file', (event, filePath) => {
    addToPinnedFiles(filePath);
    return { success: true };
});

ipcMain.handle('unpin-file', (event, filePath) => {
    removeFromPinnedFiles(filePath);
    return { success: true };
});

ipcMain.handle('is-pinned', (event, filePath) => {
    return isPinned(filePath);
});

ipcMain.handle('clear-recent-files', () => {
    clearRecentFiles();
    return { success: true };
});

ipcMain.handle('show-in-folder', (event, filePath) => {
    shell.showItemInFolder(filePath);
});

// ============ APP LIFECYCLE ============
app.on('open-file', (event, filePath) => {
    event.preventDefault();
    if (mainWindow) {
        openFile(filePath);
    } else {
        app.once('ready', () => setTimeout(() => openFile(filePath), 500));
    }
});

app.whenReady().then(() => {
    console.log('App ready');
    loadRecentFiles();
    loadPinnedFiles();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});
