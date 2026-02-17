import type { DataflowDirection } from '../../app/types';
import styles from './Controls.module.css';

type DataflowControlsProps = {
  dataflowDirection: DataflowDirection;
  setDataflowDirection: (direction: DataflowDirection) => void;
  dataflowMaxDepth: number;
  setDataflowMaxDepth: (depth: number) => void;
  dataflowRootID: string | null;
  refreshDataflow: () => void;
};

export function DataflowControls(props: DataflowControlsProps) {
  const { dataflowDirection, setDataflowDirection, dataflowMaxDepth, setDataflowMaxDepth, dataflowRootID, refreshDataflow } = props;

  return (
    <div className={styles.controls}>
      <label>
        Direction
        <select value={dataflowDirection} onChange={(event) => setDataflowDirection(event.target.value as DataflowDirection)}>
          <option value="forward">forward</option>
          <option value="backward">backward</option>
        </select>
      </label>

      <label>
        Max depth
        <input
          type="range"
          min={4}
          max={40}
          step={1}
          value={dataflowMaxDepth}
          onChange={(event) => setDataflowMaxDepth(Number(event.target.value))}
        />
        <span>{dataflowMaxDepth}</span>
      </label>

      <button type="button" disabled={!dataflowRootID} onClick={refreshDataflow}>
        Re-run slice
      </button>
    </div>
  );
}
