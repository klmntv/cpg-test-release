import styles from './Controls.module.css';

type TypesControlsProps = {
  typeQuery: string;
  setTypeQuery: (value: string) => void;
  refreshTypeQuery: () => void;
};

export function TypesControls(props: TypesControlsProps) {
  const { typeQuery, setTypeQuery, refreshTypeQuery } = props;

  return (
    <div className={styles.controls}>
      <input value={typeQuery} onChange={(event) => setTypeQuery(event.target.value)} placeholder="interface/type name contains" />
      <button type="button" onClick={refreshTypeQuery}>
        Refresh types
      </button>
    </div>
  );
}
