import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { startLanServer } from "./lanServer";
import { discoverRooms } from "./discovery";

app.setName("Farming");
// Automated smoke tests use an isolated profile and hidden windows.
const smokeTest = process.env.FARMING_SMOKE_TEST === "1";
if (smokeTest && process.env.FARMING_TEST_PROFILE) app.setPath("userData", process.env.FARMING_TEST_PROFILE);
let room: Awaited<ReturnType<typeof startLanServer>> | null = null;
let quitting = false;
let starting: Promise<Awaited<ReturnType<typeof startLanServer>>> | null = null;
const page = pathToFileURL(join(__dirname, "web", "index.html")).toString();
app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 1360, height: 900, minWidth: 420, minHeight: 600,
    title: "Farming", backgroundColor: "#101715", autoHideMenuBar: true, show: false,
    webPreferences: { preload: join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => { if (url !== page) event.preventDefault(); });
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  const validateSender = (event: Electron.IpcMainInvokeEvent) => {
    if (event.sender !== window.webContents || event.senderFrame?.url !== page) throw new Error("Geçersiz istek.");
  };
  ipcMain.handle("farming:host", async (event, name: string) => {
    validateSender(event);
    try {
      if (!room) {
        starting ??= startLanServer({ saveFile: join(app.getPath("userData"), "lan-room.json"), name });
        try { room = await starting; } finally { starting = null; }
      }
      return room.info;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EADDRINUSE") throw new Error("Bu bilgisayarda zaten açık bir oda var. Listeden katılın veya diğer odayı kapatın.");
      throw error;
    }
  });
  let scanning: ReturnType<typeof discoverRooms> | null = null;
  ipcMain.handle("farming:discover", async (event) => {
    validateSender(event);
    scanning ??= discoverRooms();
    try { return await scanning; } finally { scanning = null; }
  });
  ipcMain.handle("farming:stop", async (event) => {
    validateSender(event);
    if (room) { await room.close(); room = null; }
  });
  window.on("close", (event) => {
    if (room && !quitting) {
      const choice = dialog.showMessageBoxSync(window, {
        type: "question", buttons: ["Oyuna dön", "Kaydet ve kapat"], defaultId: 0, cancelId: 0,
        title: "Farming odası açık", message: "Kapatınca diğer oyuncuların bağlantısı kesilecek. Çiftlikler bu bilgisayarda kayıtlı kalır.",
      });
      if (choice === 0) event.preventDefault();
    }
  });
  await window.loadURL(page);
  if (!smokeTest) window.show();
});
app.on("window-all-closed", () => app.quit());
app.on("before-quit", (event) => {
  if (room && !quitting) {
    event.preventDefault(); quitting = true;
    room.close().then(() => { room = null; app.quit(); }).catch((error) => {
      quitting = false;
      dialog.showErrorBox("Oda kaydedilemedi", String(error));
    });
  }
});
