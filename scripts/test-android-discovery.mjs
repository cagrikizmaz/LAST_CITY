import { build } from 'esbuild';
import { mkdtemp, readdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const temporary = await mkdtemp(join(tmpdir(), 'farming-java-discovery-'));
const run = (command, args) => new Promise((done, reject) => {
  const child = spawn(command, args, { windowsHide: true });
  let out = '', err = '';
  child.stdout.on('data', (data) => { out += data; }); child.stderr.on('data', (data) => { err += data; });
  child.on('error', reject); child.on('exit', (code) => code === 0 ? done(out) : reject(new Error(err || `Exit ${code}`)));
});
let responder;
try {
  const javaRoot = join(process.env.LOCALAPPDATA, 'KuldenBuild', 'java');
  const jdk = process.env.JAVA_HOME || join(javaRoot, (await readdir(javaRoot, { withFileTypes: true })).find((item) => item.isDirectory()).name);
  await build({ entryPoints: ['desktop/discovery.ts'], outfile: join(temporary, 'discovery.cjs'), platform: 'node', format: 'cjs', bundle: true });
  const discovery = createRequire(import.meta.url)(join(temporary, 'discovery.cjs'));
  const room = { id: '12345678-1234-1234-1234-123456789abc', name: 'Java discovery test', port: 4765, players: 1, capacity: 16, protocol: 2 };
  responder = await discovery.startDiscoveryResponder(() => room);
  await writeFile(join(temporary, 'DiscoverySmoke.java'), `
import com.kulden.game.LanDiscoveryScanner;
public class DiscoverySmoke {
  public static void main(String[] args) throws Exception {
    LanDiscoveryScanner.Result result = new LanDiscoveryScanner().scan();
    System.out.println(result.nonce);
    for (LanDiscoveryScanner.Reply reply : result.replies) System.out.println(reply.json);
  }
}`);
  await run(join(jdk, 'bin', 'javac.exe'), ['-encoding', 'UTF-8', '-d', temporary,
    resolve('android/app/src/main/java/com/kulden/game/LanDiscoveryScanner.java'), join(temporary, 'DiscoverySmoke.java')]);
  const output = await run(join(jdk, 'bin', 'java.exe'), ['-cp', temporary, 'DiscoverySmoke']);
  const [nonce, ...lines] = output.trim().split(/\r?\n/);
  const replies = lines.map((line) => JSON.parse(line));
  assert(replies.some((reply) => reply.nonce === nonce && reply.room.id === room.id));
  assert(replies.every((reply) => !('code' in reply.room)));
  console.log('PASS: production Android Java scanner discovers the desktop room over UDP.');
} finally {
  if (responder) await responder.close();
  await rm(temporary, { recursive: true, force: true });
}
