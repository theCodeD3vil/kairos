import { useMemo, useState } from 'react';
import { ButtonDropdown } from '@/components/ruixen/button-dropdown';
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
  const selectedOption = options.find((option) => option.id === selectedMachine);
  const dropdownItems = options.map((option) => ({
    label: option.label,
    onClick: () => setSelectedMachine(option.id),
  }));

  return (
    <ButtonDropdown
      label={selectedOption?.label ?? 'Select Machine'}
      items={dropdownItems}
    />
  );
}
