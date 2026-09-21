package com.kulden.game;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InterfaceAddress;
import java.net.NetworkInterface;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Pure Java transport, also exercised against the desktop responder in integration tests. */
public final class LanDiscoveryScanner {
    public static final int PORT = 4766;
    private volatile DatagramSocket activeSocket;
    private volatile boolean cancelled;
    public static final class Reply {
        public final String address;
        public final String json;
        Reply(String address, String json) { this.address = address; this.json = json; }
    }
    public static final class Result {
        public final String nonce;
        public final List<Reply> replies = new ArrayList<>();
        Result(String nonce) { this.nonce = nonce; }
    }
    public Result scan() throws Exception {
        Result result = new Result(UUID.randomUUID().toString().replace("-", ""));
        byte[] query = ("{\"service\":\"farming-lan\",\"type\":\"discover\",\"nonce\":\"" + result.nonce + "\"}").getBytes(StandardCharsets.UTF_8);
        Set<InetAddress> targets = new LinkedHashSet<>();
        targets.add(InetAddress.getByName("255.255.255.255"));
        targets.add(InetAddress.getByName("127.0.0.1"));
        for (NetworkInterface network : Collections.list(NetworkInterface.getNetworkInterfaces())) {
            if (!network.isUp() || network.isLoopback()) continue;
            for (InterfaceAddress address : network.getInterfaceAddresses()) {
                if (address.getBroadcast() != null) targets.add(address.getBroadcast());
            }
        }
        try (DatagramSocket socket = new DatagramSocket()) {
            activeSocket = socket;
            if (cancelled) return result;
            socket.setBroadcast(true);
            socket.setSoTimeout(250);
            long deadline = System.nanoTime() + 2_200_000_000L;
            long nextSend = 0;
            while (!cancelled && System.nanoTime() < deadline) {
                if (System.nanoTime() >= nextSend) {
                    for (InetAddress target : targets) {
                        try { socket.send(new DatagramPacket(query, query.length, target, PORT)); }
                        catch (java.io.IOException ignored) { /* A disconnected adapter must not block the others. */ }
                    }
                    nextSend = System.nanoTime() + 650_000_000L;
                }
                byte[] buffer = new byte[2048];
                DatagramPacket response = new DatagramPacket(buffer, buffer.length);
                try {
                    socket.receive(response);
                    if (response.getAddress() instanceof Inet4Address && result.replies.size() < 256)
                        result.replies.add(new Reply(response.getAddress().getHostAddress(), new String(response.getData(), 0, response.getLength(), StandardCharsets.UTF_8)));
                } catch (SocketTimeoutException ignored) { /* Continue until the scan deadline. */ }
            }
        } finally { activeSocket = null; }
        return result;
    }
    public void cancel() {
        cancelled = true;
        DatagramSocket socket = activeSocket;
        if (socket != null) socket.close();
    }
}
