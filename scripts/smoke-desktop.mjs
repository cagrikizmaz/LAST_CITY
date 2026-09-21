import { _electron as electron, expect } from '@playwright/test';
import { build } from 'esbuild';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const profile = await mkdtemp(join(tmpdir(), 'farming-exe-smoke-'));
const compiled = await build({ entryPoints: ['src/game.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const game = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const initial = { ...game.emptyState(), paused: true };
await writeFile(join(profile, 'lan-room.json'), JSON.stringify({ version: 1, code: '654321', offers: [], players: [
  { id: 'host', token: 'host-secret', name: 'Host', state: { ...initial, stock: { ...initial.stock, wood: 20 } } },
] }));
const env = { ...process.env, FARMING_SMOKE_TEST: '1', FARMING_TEST_PROFILE: profile };
delete env.ELECTRON_RUN_AS_NODE;
const packaged = process.argv.includes('--packaged');
const executablePath = resolve(process.env.FARMING_PACKAGED_EXE || 'artifacts/windows/win-unpacked/Farming.exe');
const launchStarted = Date.now();
const application = await electron.launch({
  ...(packaged ? { executablePath, args: [] } : { args: ['desktop-build'] }),
  env, timeout: 60000,
});
let guestApplication;
try {
  const host = await application.firstWindow();
  await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().forEach((window) => window.webContents.setBackgroundThrottling(false)));
  const failures = [];
  host.on('pageerror', (error) => failures.push(error.message));
  host.on('websocket', (socket) => socket.on('socketerror', (error) => console.error('WebSocket:', error)));
  await expect(host.locator('.brand b')).toHaveText('Farming');
  console.log(`Application ready in ${Date.now() - launchStarted} ms (${packaged ? 'packaged' : 'development'}; automated launch).`);
  await host.evaluate(() => localStorage.setItem('farming-player:ws://127.0.0.1:4765/room:host', 'host-secret'));
  await host.getByRole('button', { name: 'Multiplayer', exact: false }).click();
  await host.getByLabel('Oyuncu adı', { exact: true }).fill('Host');
  await host.getByLabel('Oda adı', { exact: true }).fill('Test çiftliği');
  await host.getByRole('button', { name: 'Oda kur', exact: true }).click();
  await expect(host.getByRole('button', { name: 'Odadan ayrıl', exact: true })).toBeVisible();
  await host.getByRole('button', { name: 'Oyuncu pazarı', exact: true }).click();
  await expect(host.getByRole('heading', { name: 'Oyuncu pazarı' })).toBeVisible();
  const guestProfile = join(profile, 'guest');
  await mkdir(guestProfile);
  guestApplication = await electron.launch({
    ...(packaged ? { executablePath, args: [] } : { args: ['desktop-build'] }),
    env: { ...env, FARMING_TEST_PROFILE: guestProfile }, timeout: 60000,
  });
  const guest = await guestApplication.firstWindow();
  await guestApplication.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    window.setMinimumSize(360, 600); window.setContentSize(390, 844);
    window.webContents.setBackgroundThrottling(false);
  });
  guest.on('pageerror', (error) => failures.push(error.message));
  await expect(guest.locator('.brand b')).toHaveText('Farming');
  await guest.locator('.topbar').getByRole('button', { name: 'Multiplayer', exact: false }).click();
  await guest.getByLabel('Oyuncu adı', { exact: true }).fill('Guest');
  await guest.getByRole('button', { name: 'Test çiftliği', exact: false }).click();
  await expect(guest.getByLabel('Ev sahibinin IP adresi')).toHaveCount(0);
  await mkdir('artifacts/qa', { recursive: true });
  const listImage = await guestApplication.evaluate(async ({ BrowserWindow }) =>
    (await BrowserWindow.getAllWindows()[0].webContents.capturePage(undefined, { stayHidden: false, stayAwake: true })).toPNG().toString('base64'));
  await writeFile('artifacts/qa/room-list-mobile.png', Buffer.from(listImage, 'base64'));
  await guest.getByLabel('Katılım kodu').fill('654321');
  await guest.getByRole('button', { name: 'Odaya katıl', exact: true }).click();
  await expect(guest.getByRole('button', { name: 'Odadan ayrıl', exact: true })).toBeVisible();
  await guest.getByRole('button', { name: 'Oyuncu pazarı', exact: true }).click();
  await expect(guest.getByRole('heading', { name: 'Oyuncu pazarı' })).toBeVisible();
  await expect(host.locator('.network-players')).toContainText('Guest');
  await host.getByLabel('Satılacak adet').fill('10');
  await host.getByLabel('Satış toplam fiyatı').fill('40');
  await host.getByRole('button', { name: 'Satış ilanı aç' }).click();
  await expect(guest.locator('.player-offer')).toHaveCount(1);
  await guest.locator('.player-offer').getByRole('button', { name: 'Satın al', exact: true }).click();
  await expect(host.locator('.wallet')).toContainText('290');
  await expect(guest.locator('.wallet')).toContainText('210');
  await expect(host.locator('.player-offer')).toHaveCount(0);
  await guest.getByRole('button', { name: 'Sonraki güne geç' }).click();
  await expect(guest.locator('.clock-controls small').first()).toContainText('2. GÜN');
  await expect(host.locator('.clock-controls small').first()).toContainText('1. GÜN');
  await mkdir('artifacts/qa', { recursive: true });
  await host.evaluate(() => window.scrollTo(0, 0));
  await guest.evaluate(() => window.scrollTo(0, 0));
  const captures = [];
  for (const process of [application, guestApplication]) captures.push(await process.evaluate(async ({ BrowserWindow }) =>
    (await BrowserWindow.getAllWindows()[0].webContents.capturePage(undefined, { stayHidden: true, stayAwake: true })).toPNG().toString('base64')));
  await writeFile('artifacts/qa/desktop-lan.png', Buffer.from(captures[0], 'base64'));
  await writeFile('artifacts/qa/mobile-lan.png', Buffer.from(captures[1], 'base64'));
  expect(await guest.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await host.evaluate(() => window.farmingDesktop.stopHost());
  await guest.locator('.topbar').getByRole('button', { name: 'Multiplayer', exact: false }).click();
  await expect(guest.getByText('Bağlantı kesildi.', { exact: false })).toBeVisible();
  await guest.getByRole('button', { name: 'Tek oyunculuya dön' }).click();
  await expect(guest.locator('.wallet')).toContainText('250');
  await guest.getByRole('button', { name: 'Üretim', exact: true }).click();
  await guest.locator('.category-card').filter({ hasText: 'Atölyeler' }).click();
  await expect(guest.locator('.production-card')).toHaveCount(7);
  await guest.locator('.production-card').filter({ hasText: 'Değirmen' }).click();
  await guest.getByRole('button', { name: /Sahayı satın al/ }).click();
  await expect(guest.getByLabel('Yem kalan üretim', { exact: true })).toBeVisible();
  await guest.getByLabel('Yem kalan üretim', { exact: true }).fill('3');
  await guest.getByLabel('Yem kalan üretim', { exact: true }).press('Enter');
  await expect(guest.getByLabel('Yem kalan üretim', { exact: true })).toHaveValue('3');
  await guest.getByRole('button', { name: 'Oyuncu pazarı', exact: true }).click();
  await expect(guest.getByRole('heading', { name: 'Ürün pazarı', exact: true })).toBeVisible();
  await guest.getByLabel('Pazar miktarı').fill('2');
  await guest.getByRole('button', { name: /^Satın al ·/ }).click();
  await guest.getByRole('button', { name: /^Sat ·/ }).click();
  await expect(guest.getByRole('button', { name: /^Sat ·/ })).toBeDisabled();
  expect(await guest.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(failures).toEqual([]);
  console.log('PASS: two Electron apps, automatic room discovery, code-only join, trade, independent clocks, disconnect and offline save; screenshots saved.');
} finally {
  if (guestApplication) {
    await guestApplication.evaluate(({ app }) => app.exit(0)).catch(() => {});
    await guestApplication.close().catch(() => {});
  }
  await application.evaluate(({ app }) => app.exit(0)).catch(() => {});
  await application.close().catch(() => {});
  await rm(profile, { recursive: true, force: true });
}
