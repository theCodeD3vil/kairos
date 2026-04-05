import { useMemo, useState } from 'react';
import SegmentedButton from '@/components/ui/segmented-button';
import type { MachineInfo } from '@/mocks/system-info';

type MachineScopePlaceholderProps = {
  machines: MachineInfo[];
  currentMachineName: string;
};

export function MachineScopePlaceholder({
  machines,
  currentMachineName,
}: MachineScopePlaceholderProps) {
  const options = useMemo<Array<{ id: string; label: string; title: string }>>(() => {
    const unique = Array.from(new Set(machines.map((machine) => machine.machineName)));
    return [
      { id: 'all', label: 'All Machines', title: 'All Machines' },
      ...unique.map((machineName) => ({
        id: machineName,
        label: machineName,
        title: machineName,
      })),
    ];
  }, [machines]);

  const [selectedMachine, setSelectedMachine] = useState<string>(currentMachineName);

  return (
    <SegmentedButton
      buttons={options}
      value={selectedMachine}
      onChange={setSelectedMachine}
      size="sm"
    />
  );
}
