// Thin runtime shim for @capacitor/haptics. No-op on web or when the
// plugin isn't installed. The mobile wrapper installs the plugin and
// exposes it on window.Capacitor.Plugins.Haptics.

type ImpactStyle = 'LIGHT' | 'MEDIUM' | 'HEAVY';

function plugin(): any {
  return (globalThis as any)?.Capacitor?.Plugins?.Haptics;
}

export function hapticImpact(style: ImpactStyle = 'LIGHT') {
  plugin()?.impact?.({ style }).catch?.(() => {});
}

export function hapticSelection() {
  plugin()?.selectionChanged?.().catch?.(() => {});
}
