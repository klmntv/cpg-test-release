import type { QueryDescriptor } from '../../api';
import styles from './Controls.module.css';

type WorkbenchControlsProps = {
  queries: QueryDescriptor[];
  selectedQueryName: string;
  setSelectedQueryName: (name: string) => void;
  queryLimit: number;
  setQueryLimit: (limit: number) => void;
  queryParamText: string;
  setQueryParamText: (value: string) => void;
  executeSelectedQuery: () => void;
};

export function WorkbenchControls(props: WorkbenchControlsProps) {
  const {
    queries,
    selectedQueryName,
    setSelectedQueryName,
    queryLimit,
    setQueryLimit,
    queryParamText,
    setQueryParamText,
    executeSelectedQuery,
  } = props;

  return (
    <div className={`${styles.controls} ${styles.queryControls}`}>
      <label>
        Query
        <select value={selectedQueryName} onChange={(event) => setSelectedQueryName(event.target.value)}>
          {queries.map((query) => (
            <option key={query.name} value={query.name}>
              {query.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Limit
        <input
          type="range"
          min={50}
          max={2500}
          step={50}
          value={queryLimit}
          onChange={(event) => setQueryLimit(Number(event.target.value))}
        />
        <span>{queryLimit}</span>
      </label>

      <input value={queryParamText} onChange={(event) => setQueryParamText(event.target.value)} placeholder="function_id=..., node_id=..." />

      <button type="button" onClick={executeSelectedQuery} disabled={!selectedQueryName}>
        Run query
      </button>
    </div>
  );
}
