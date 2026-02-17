import styles from './Controls.module.css';

type ImpactControlsProps = {
  impactDepth: number;
  setImpactDepth: (depth: number) => void;
  canRunImpact: boolean;
  runImpact: () => void;
};

export function ImpactControls(props: ImpactControlsProps) {
  const { impactDepth, setImpactDepth, canRunImpact, runImpact } = props;

  return (
    <div className={styles.controls}>
      <label>
        Depth
        <input type="range" min={1} max={12} step={1} value={impactDepth} onChange={(event) => setImpactDepth(Number(event.target.value))} />
        <span>{impactDepth}</span>
      </label>

      <button type="button" disabled={!canRunImpact} onClick={runImpact}>
        Run impact
      </button>
    </div>
  );
}
