// Opens a URL in the user's default browser. If that fails, the caller prints the URL instead.
import { spawn } from 'node:child_process';

export function openBrowser(url, platform = process.platform) {
  const [cmd, args] = platform === 'darwin' ? ['open', [url]]
    : platform === 'win32' ? ['explorer.exe', [url]]
      : ['xdg-open', [url]];
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true, windowsHide: true });
    child.on('error', () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}
