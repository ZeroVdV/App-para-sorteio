const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { criarDB } = require('./db');

let db;
let telaoWin;

function createMainWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        minWidth: 650,
        icon: path.join(__dirname, 'Icones/LOGO.ico'),
        resizable: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    win.removeMenu();
    win.loadFile('views/home.html');
    return win;
}

function createTelaoWindow() {
    telaoWin = new BrowserWindow({
        width: 1920,
        height: 1080,
        resizable: true,
        icon: path.join(__dirname, 'Icones/LOGO.ico'),
        fullscreen: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    telaoWin.removeMenu();
    telaoWin.loadFile('views/telao.html');
}

async function ensureDir(dirPath) {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch { }
    return dirPath;
}

function prepararPastaDB() {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'imagens.db');
}

app.whenReady().then(async () => {
    const dbPath = prepararPastaDB();
    db = criarDB(dbPath);

    await ensureDir(path.join(app.getPath('userData'), 'imagens'));

    createMainWindow();

    // ------------------- IPC HANDLERS -------------------

    ipcMain.handle('abrir-dialogo-imagem', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg'] }]
        });
        if (result.canceled || result.filePaths.length === 0) return null;
        return result.filePaths[0];
    });

    ipcMain.handle('salvar-imagem', async (event, { indice, caminho }) => {
        try {
            const destDir = await ensureDir(path.join(app.getPath('userData'), 'imagens'));
            const nomeArquivo = Date.now() + path.extname(caminho);
            const destino = path.join(destDir, nomeArquivo);
            await fs.copyFile(caminho, destino);

            return new Promise((resolve, reject) => {
                db.run(
                    `INSERT INTO imagens (indice, caminho) VALUES (?, ?)`,
                    [indice, destino],
                    function (err) {
                        if (err) return reject(err);
                        resolve({ id: this.lastID });
                    }
                );
            });
        } catch (err) {
            throw err;
        }
    });

    ipcMain.handle('atualizar-imagem', async (event, id, { indice, caminho }) => {
        return new Promise((resolve, reject) => {
            db.get(`SELECT caminho FROM imagens WHERE id = ?`, [id], async (err, row) => {
                if (err) return reject(err);

                let novoCaminho = row?.caminho;

                try {
                    if (caminho !== row.caminho) {
                        const destDir = await ensureDir(path.join(app.getPath('userData'), 'imagens'));
                        const nomeArquivo = Date.now() + path.extname(caminho);
                        novoCaminho = path.join(destDir, nomeArquivo);
                        await fs.copyFile(caminho, novoCaminho);

                        if (row.caminho) {
                            await fs.unlink(row.caminho).catch(() => { });
                        }
                    }

                    db.run(
                        `UPDATE imagens SET indice = ?, caminho = ? WHERE id = ?`,
                        [indice, novoCaminho, id],
                        function (err2) {
                            if (err2) return reject(err2);
                            resolve();
                        }
                    );
                } catch (e) {
                    reject(e);
                }
            });
        });
    });

    ipcMain.handle('deletar-imagem', async (event, id) => {
        return new Promise((resolve, reject) => {
            db.get(`SELECT caminho FROM imagens WHERE id = ?`, [id], async (err, row) => {
                if (err) return reject(err);

                if (row?.caminho) await fs.unlink(row.caminho).catch(() => { });

                db.run(`DELETE FROM imagens WHERE id = ?`, [id], function (err2) {
                    if (err2) return reject(err2);
                    resolve();
                });
            });
        });
    });

    ipcMain.handle('listar-imagens', () => {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM imagens ORDER BY indice`, [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    });

    ipcMain.handle('buscar-imagem-por-indice', (event, indice) => {
        return new Promise((resolve, reject) => {
            db.get(`SELECT * FROM imagens WHERE indice = ?`, [indice], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });
    });

    ipcMain.on('abrir-telao', () => {
        if (!telaoWin || telaoWin.isDestroyed()) createTelaoWindow();
    });

    ipcMain.on('alternar-fullscreen', () => {
        if (telaoWin && !telaoWin.isDestroyed()) {
            telaoWin.setFullScreen(!telaoWin.isFullScreen());
        }
    });

    ipcMain.on('atualizar-imagem', (event, data) => {
        if (!telaoWin || telaoWin.isDestroyed()) {
            createTelaoWindow();
            telaoWin.webContents.once('did-finish-load', () => {
                telaoWin.webContents.send('atualizar-imagem', data);
            });
        } else {
            telaoWin.webContents.send('atualizar-imagem', data);
        }
    });


    ipcMain.on('limparTelao', () => {
        if (!telaoWin || telaoWin.isDestroyed()) return;
        telaoWin.webContents.send('limparImagem');
    });

    ipcMain.handle('apagar-todas-imagens', async () => {
        return new Promise((resolve, reject) => {
            db.all(`SELECT caminho FROM imagens`, [], async (err, rows) => {
                if (err) return reject(err);

                for (const r of rows) {
                    if (r.caminho) await fs.unlink(r.caminho).catch(() => { });
                }

                db.run(`DELETE FROM imagens`, [], function (err2) {
                    if (err2) return reject(err2);
                    resolve();
                });
            });
        });
    });

    ipcMain.handle('verificar-telao-aberto', () => {
        return !!telaoWin && !telaoWin.isDestroyed();
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
});

app.on('will-quit', async () => {
    db?.close();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

