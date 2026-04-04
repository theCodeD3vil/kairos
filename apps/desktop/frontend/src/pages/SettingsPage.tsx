import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SectionCard } from '@/components/dashboard/SectionCard';

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <SectionCard title="Privacy" description="Local data handling and export behavior.">
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary">Export Local Snapshot</Button>
          <Button variant="outline">Clear Local Cache</Button>
        </div>
      </SectionCard>

      <SectionCard title="Tracking" description="Editor and runtime signal collection scope.">
        <div className="grid grid-cols-2 gap-3">
          <Select defaultValue="balanced">
            <SelectTrigger>
              <SelectValue placeholder="Tracking intensity" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Tracking Intensity</SelectLabel>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Input placeholder="Sampling interval (seconds)" value="15" readOnly />
        </div>
      </SectionCard>

      <SectionCard title="Exclusions" description="Workspaces and files to ignore from local metrics.">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Input placeholder="Add exclusion path" />
          <Button>Add</Button>
        </div>
      </SectionCard>

      <SectionCard title="Appearance" description="Theme and dashboard density preferences.">
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary">Dark Theme (Default)</Button>
          <Button variant="outline">Compact Density</Button>
        </div>
      </SectionCard>

      <SectionCard title="Startup Behavior" description="Desktop launch and tray behavior placeholders.">
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline">Launch on Login</Button>
          <Button variant="outline">Start Minimized</Button>
        </div>
      </SectionCard>
    </div>
  );
}
