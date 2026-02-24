import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const colorSwatches = [
  { name: 'Primary', var: '--primary', fg: '--primary-foreground' },
  { name: 'Secondary', var: '--secondary', fg: '--secondary-foreground' },
  { name: 'Background', var: '--background', fg: '--foreground' },
  { name: 'Card', var: '--card', fg: '--card-foreground' },
  { name: 'Muted', var: '--muted', fg: '--muted-foreground' },
  { name: 'Accent', var: '--accent', fg: '--accent-foreground' },
  { name: 'Destructive', var: '--destructive', fg: '--destructive-foreground' },
  { name: 'Border', var: '--border', fg: '--foreground' },
  { name: 'Success', var: '--success', fg: '--success-foreground' },
  { name: 'Warning', var: '--warning', fg: '--warning-foreground' },
  { name: 'Sidebar BG', var: '--sidebar-background', fg: '--sidebar-foreground' },
  { name: 'Sidebar Accent', var: '--sidebar-accent', fg: '--sidebar-accent-foreground' },
];

const Swatch = ({ name, cssVar, fgVar }: { name: string; cssVar: string; fgVar: string }) => (
  <div className="flex flex-col items-center gap-1.5">
    <div
      className="w-16 h-16 rounded-lg border border-border shadow-sm"
      style={{ backgroundColor: `hsl(var(${cssVar}))` }}
    />
    <span className="text-[11px] font-medium text-foreground">{name}</span>
    <span className="text-[10px] font-mono text-muted-foreground">{cssVar}</span>
  </div>
);

const DesignTest = () => {
  return (
    <div className="min-h-screen bg-background p-8 space-y-12 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">Design System Test</h1>
        <p className="text-sm text-muted-foreground">Temporary page for visual validation</p>
      </div>

      {/* Color Swatches */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2">Color Swatches</h2>
        <div className="flex flex-wrap gap-6">
          {colorSwatches.map((s) => (
            <Swatch key={s.var} name={s.name} cssVar={s.var} fgVar={s.fg} />
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2">Typography Scale</h2>
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-foreground">H1 — The quick brown fox</h1>
          <h2 className="text-3xl font-semibold text-foreground">H2 — The quick brown fox</h2>
          <h3 className="text-2xl font-semibold text-foreground">H3 — The quick brown fox</h3>
          <h4 className="text-xl font-medium text-foreground">H4 — The quick brown fox</h4>
          <h5 className="text-lg font-medium text-foreground">H5 — The quick brown fox</h5>
          <h6 className="text-base font-medium text-foreground">H6 — The quick brown fox</h6>
          <p className="text-sm text-foreground">Body — The quick brown fox jumps over the lazy dog. This is regular body text used throughout the application.</p>
          <p className="text-xs text-muted-foreground">Small / Muted — Secondary information, timestamps, and helper text.</p>
        </div>
      </section>

      {/* Buttons */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="destructive">Destructive Button</Button>
          <Button disabled>Disabled Button</Button>
        </div>
      </section>

      {/* Cards */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2">Cards</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Standard Card</CardTitle>
              <CardDescription>This is a card using the default card token colors from the design system.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Card content goes here with muted foreground text.</p>
            </CardContent>
          </Card>
          <div className="glass-panel rounded-lg p-5 space-y-2">
            <h3 className="text-base font-semibold text-foreground">Glass Panel</h3>
            <p className="text-sm text-muted-foreground">This uses the custom glass-panel utility class with backdrop blur.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DesignTest;
