const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("farmingDesktop", {
  startHost: (name) => ipcRenderer.invoke("farming:host", name),
  stopHost: () => ipcRenderer.invoke("farming:stop"),
  discoverRooms: () => ipcRenderer.invoke("farming:discover"),
});
