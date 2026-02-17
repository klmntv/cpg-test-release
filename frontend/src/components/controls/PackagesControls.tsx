import type { ModuleKey } from '../../app/types';
import styles from './Controls.module.css';

type PackagesControlsProps = {
  topN: number;
  setTopN: (value: number) => void;
  minEdgeWeight: number;
  setMinEdgeWeight: (value: number) => void;
  packageModuleFilter: ModuleKey | 'all';
  setPackageModuleFilter: (value: ModuleKey | 'all') => void;
  packageNameFilter: string;
  setPackageNameFilter: (value: string) => void;
  moduleColors: Record<ModuleKey, string>;
};

export function PackagesControls(props: PackagesControlsProps) {
  const {
    topN,
    setTopN,
    minEdgeWeight,
    setMinEdgeWeight,
    packageModuleFilter,
    setPackageModuleFilter,
    packageNameFilter,
    setPackageNameFilter,
    moduleColors,
  } = props;

  return (
    <div className={styles.controls}>
      <label>
        Top N
        <input type="range" min={40} max={280} step={10} value={topN} onChange={(event) => setTopN(Number(event.target.value))} />
        <span>{topN}</span>
      </label>

      <label>
        Min weight
        <input
          type="range"
          min={1}
          max={24}
          step={1}
          value={minEdgeWeight}
          onChange={(event) => setMinEdgeWeight(Number(event.target.value))}
        />
        <span>{minEdgeWeight}</span>
      </label>

      <label>
        Module
        <select
          value={packageModuleFilter}
          onChange={(event) => setPackageModuleFilter(event.target.value as ModuleKey | 'all')}
        >
          <option value="all">all</option>
          <option value="prometheus">prometheus</option>
          <option value="client_golang">client_golang</option>
          <option value="adapter">adapter</option>
          <option value="alertmanager">alertmanager</option>
        </select>
      </label>

      <input value={packageNameFilter} onChange={(event) => setPackageNameFilter(event.target.value)} placeholder="package contains" />

      <div className={styles.legend}>
        {Object.entries(moduleColors).map(([key, color]) => (
          <span key={key} className={styles.legendItem}>
            <i className={styles.legendDot} style={{ background: color }} />
            {key}
          </span>
        ))}
      </div>
    </div>
  );
}
