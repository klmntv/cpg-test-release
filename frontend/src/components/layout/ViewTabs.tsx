import type { ViewMode } from '../../app/types';
import styles from './ViewTabs.module.css';

type ViewTabsProps = {
  viewMode: ViewMode;
  onSwitch: (mode: ViewMode) => void;
};

const tabs: Array<{ mode: ViewMode; label: string }> = [
  { mode: 'packages', label: 'Packages' },
  { mode: 'calls', label: 'Calls' },
  { mode: 'dataflow', label: 'Dataflow' },
  { mode: 'hotspots', label: 'Hotspots' },
  { mode: 'impact', label: 'Impact' },
  { mode: 'types', label: 'Types' },
  { mode: 'workbench', label: 'Workbench' },
];

export function ViewTabs(props: ViewTabsProps) {
  const { viewMode, onSwitch } = props;

  return (
    <div className={styles.modeSwitch}>
      {tabs.map((tab) => (
        <button key={tab.mode} type="button" className={viewMode === tab.mode ? styles.active : ''} onClick={() => onSwitch(tab.mode)}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
