package com.kulden.game;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "LanDiscovery")
public class LanDiscoveryPlugin extends Plugin {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean scanning = new AtomicBoolean(false);
    private volatile LanDiscoveryScanner scanner;

    @PluginMethod
    public void discoverRooms(PluginCall call) {
        if (!scanning.compareAndSet(false, true)) { call.reject("Oda araması devam ediyor."); return; }
        executor.execute(() -> {
            try {
                scanner = new LanDiscoveryScanner();
                LanDiscoveryScanner.Result result = scanner.scan();
                Map<String, JSObject> rooms = new LinkedHashMap<>();
                for (LanDiscoveryScanner.Reply reply : result.replies) {
                    try {
                        JSONObject message = new JSONObject(reply.json);
                        if (!"farming-lan".equals(message.optString("service")) || !"room".equals(message.optString("type")) || !result.nonce.equals(message.optString("nonce"))) continue;
                        JSONObject room = message.getJSONObject("room");
                        String id = room.getString("id"), name = room.getString("name");
                        int port = room.getInt("port"), players = room.getInt("players"), capacity = room.getInt("capacity");
                        if (!id.matches("[a-f0-9-]{36}") || name.trim().isEmpty() || name.length() > 40 || port < 1 || port > 65535 || room.getInt("protocol") != 2 || players < 0 || capacity < 1 || capacity > 16 || players > capacity || !isLocal(reply.address)) continue;
                        JSObject found = new JSObject();
                        found.put("id", id); found.put("name", name); found.put("port", port);
                        found.put("players", players); found.put("capacity", capacity); found.put("protocol", 2);
                        found.put("address", reply.address + ":" + port);
                        JSObject previous = rooms.get(id);
                        if (previous == null || previous.optString("address").startsWith("127.")) rooms.put(id, found);
                    } catch (Exception ignored) { /* Ignore unrelated or malformed discovery traffic. */ }
                }
                JSArray list = new JSArray();
                for (JSObject room : rooms.values()) list.put(room);
                JSObject response = new JSObject(); response.put("rooms", list); call.resolve(response);
            } catch (Exception error) { call.reject("Odalar aranamadı. Aynı Wi-Fi ağına bağlı olduğunuzu kontrol edip yeniden deneyin.", error); }
            finally { scanner = null; scanning.set(false); }
        });
    }
    private static boolean isLocal(String address) {
        String[] parts = address.split("\\.");
        if (parts.length != 4) return false;
        int a = Integer.parseInt(parts[0]), b = Integer.parseInt(parts[1]);
        return a == 10 || a == 127 || (a == 192 && b == 168) || (a == 172 && b >= 16 && b <= 31) || (a == 169 && b == 254);
    }
    @Override
    protected void handleOnDestroy() {
        if (scanner != null) scanner.cancel();
        executor.shutdownNow();
        super.handleOnDestroy();
    }
}
