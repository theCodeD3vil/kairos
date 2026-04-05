import { systemInfoSnapshot } from '@/mocks/system-info';

export function SettingsPage() {
  const { currentMachine, knownMachines, appStatus } = systemInfoSnapshot;

  return (
    <div className="space-y-4">
      <section className="rounded-[18px] bg-[#e5e8e4] p-4">
        <h1 className="text-2xl font-semibold text-[#1d2428]">Settings</h1>
      </section>

      <section className="rounded-[18px] bg-[#ecefee] p-4">
        <h2 className="text-lg font-semibold text-[#1d2428]">Machine Info</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <InfoBlock label="Machine Name" value={currentMachine.machineName} />
          <InfoBlock label="Machine ID" value={currentMachine.machineId} mono />
          <InfoBlock label="Hostname" value={currentMachine.hostname} mono />
          <InfoBlock label="Operating System" value={currentMachine.os} />
          <InfoBlock label="OS Version" value={currentMachine.osVersion} />
          <InfoBlock label="Architecture" value={currentMachine.architecture} mono />
          <InfoBlock label="Editor" value={currentMachine.editorName} />
          <InfoBlock label="Editor Version" value={currentMachine.editorVersion} />
          <InfoBlock label="Extension Version" value={currentMachine.extensionVersion} />
          <InfoBlock label="App Version" value={appStatus.appVersion} />
          <InfoBlock label="Tracking Status" value={appStatus.trackingEnabled ? 'Enabled' : 'Disabled'} />
          <InfoBlock label="Local Only" value={appStatus.localOnlyMode ? 'Enabled' : 'Disabled'} />
          <InfoBlock label="Last Seen" value={currentMachine.lastSeenAt} mono />
          <InfoBlock label="Last Updated" value={appStatus.lastUpdatedAt} mono />
        </div>
      </section>

      <section className="rounded-[18px] bg-[#ecefee] p-4">
        <h2 className="text-lg font-semibold text-[#1d2428]">Known Machines</h2>
        <div className="mt-3 space-y-2">
          {knownMachines.map((machine) => (
            <article
              key={machine.machineId}
              className="rounded-xl bg-[#f2f5f4] p-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-[#1d2428]">{machine.machineName}</p>
                <p className="font-numeric text-xs text-[#5c6d70]">{machine.lastSeenAt}</p>
              </div>
              <p className="mt-1 text-xs text-[#5c6d70]">
                {machine.os} {machine.osVersion} · {machine.architecture} · {machine.editorName}{' '}
                {machine.editorVersion}
              </p>
              <p className="font-numeric mt-1 text-xs text-[#5c6d70]">
                {machine.machineId} · {machine.hostname}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function InfoBlock({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <article className="rounded-xl bg-[#f2f5f4] p-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]">
      <p className="text-xs text-[#607073]">{label}</p>
      <p className={`mt-1 text-sm font-medium text-[#1d2428] ${mono ? 'font-numeric' : ''}`}>{value}</p>
    </article>
  );
}
