export interface UpdateInfo {
  available: boolean;
  version: string;
  currentVersion: string;
  releaseNotes: string;
  downloadUrl: string;
  releaseDate: string;
  mandatory: boolean;
}

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';

export interface UpdateProgress {
  status: UpdateStatus;
  progress?: number;
  message?: string;
  info?: UpdateInfo;
}

type Listener = (progress: UpdateProgress) => void;

class UpdateService {
  private listeners: Set<Listener> = new Set();
  private status: UpdateProgress = { status: 'idle' };
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private readonly RELEASES_URL = import.meta.env.RELEASES_URL || 'https://api.github.com/repos/universalinspectionco/Quotation-Manager-V2/releases/latest';

  private emit(update: Partial<UpdateProgress>) {
    this.status = { ...this.status, ...update };
    this.listeners.forEach(l => l(this.status));
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  public getStatus(): UpdateProgress {
    return this.status;
  }

  public async checkForUpdates(): Promise<UpdateInfo | null> {
    if (this.status.status === 'checking') return null;
    this.emit({ status: 'checking', message: 'Checking for updates...' });

    try {
      const res = await fetch(this.RELEASES_URL, {
        headers: { Accept: 'application/vnd.github.v3+json' },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const release = await res.json();
      const latestVersion = release.tag_name?.replace(/^v/, '') || '0.0.0';
      const currentVersion = import.meta.env.PACKAGE_VERSION || '2.0.0';

      if (this.compareVersions(latestVersion, currentVersion) > 0) {
        const info: UpdateInfo = {
          available: true,
          version: latestVersion,
          currentVersion,
          releaseNotes: release.body || 'No release notes provided.',
          downloadUrl: release.html_url || '',
          releaseDate: release.published_at || new Date().toISOString(),
          mandatory: false,
        };
        this.emit({ status: 'available', info, message: `Update v${latestVersion} available` });
        return info;
      }

      this.emit({ status: 'idle', message: 'You are on the latest version', info: { available: false, version: currentVersion, currentVersion, releaseNotes: '', downloadUrl: '', releaseDate: '', mandatory: false } });
      return { available: false, version: currentVersion, currentVersion, releaseNotes: '', downloadUrl: '', releaseDate: '', mandatory: false };
    } catch (e: any) {
      this.emit({ status: 'error', message: `Update check failed: ${e.message}` });
      return null;
    }
  }

  public async downloadUpdate(): Promise<boolean> {
    if (this.status.status !== 'available') return false;
    this.emit({ status: 'downloading', progress: 0, message: 'Downloading update...' });

    if (typeof window !== 'undefined' && (window as any).electronAPI?.downloadUpdate) {
      try {
        const result = await (window as any).electronAPI.downloadUpdate();
        if (result?.success) {
          this.emit({ status: 'downloaded', progress: 100, message: 'Update downloaded. Ready to install.' });
          return true;
        }
      } catch (e: any) {
        this.emit({ status: 'error', message: `Download failed: ${e.message}` });
      }
    } else {
      this.emit({ status: 'error', message: 'Auto-update only available in desktop app' });
    }
    return false;
  }

  public async installUpdate(): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.installUpdate) {
      await (window as any).electronAPI.installUpdate();
    }
  }

  public startAutoCheck(intervalMinutes = 60): void {
    if (this.checkInterval) return;
    this.checkForUpdates();
    this.checkInterval = setInterval(() => this.checkForUpdates(), intervalMinutes * 60 * 1000);
  }

  public stopAutoCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private compareVersions(a: string, b: string): number {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const va = pa[i] || 0;
      const vb = pb[i] || 0;
      if (va !== vb) return va - vb;
    }
    return 0;
  }
}

export const updateService = new UpdateService();