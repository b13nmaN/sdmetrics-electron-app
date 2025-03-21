import electron, { ipcMain, app, BrowserWindow, dialog } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
if (typeof electron === "string") {
  throw new TypeError("Not running in an Electron environment!");
}
const { env } = process;
const isEnvSet = "ELECTRON_IS_DEV" in env;
const getFromEnv = Number.parseInt(env.ELECTRON_IS_DEV, 10) === 1;
const isDev = isEnvSet ? getFromEnv : !electron.app.isPackaged;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
ipcMain.handle("dialog:openFile", async () => {
  if (!mainWindow) return null;
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [{ name: "XMI Files", extensions: ["xmi", "xml"] }]
  });
  if (canceled || filePaths.length === 0) {
    return null;
  }
  return filePaths[0];
});
ipcMain.handle("dialog:getFilePath", async () => {
  if (!mainWindow) return null;
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    filters: [{ name: "XMI Files", extensions: ["xmi", "xml"] }]
  });
  if (canceled) {
    return null;
  }
  return filePath;
});
ipcMain.handle("file:read", async (_, filepath) => {
  try {
    const content = await fs.readFile(filepath, "utf8");
    return content;
  } catch (error) {
    console.error("Error reading file:", error);
    throw new Error(`Could not read file: ${error.message}`);
  }
});
ipcMain.handle("file:write", async (_, filepath, content) => {
  try {
    await fs.writeFile(filepath, content, "utf8");
    return true;
  } catch (error) {
    console.error("Error writing file:", error);
    throw new Error(`Could not write file: ${error.message}`);
  }
});
app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});
