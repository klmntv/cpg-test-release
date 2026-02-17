import styles from './SymbolSearchPanel.module.css';

type SymbolSearchPanelProps = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  runSearchNow: () => void;
  symbolSearching: boolean;
  searchKind: string;
  setSearchKind: (value: string) => void;
  searchPackageFilter: string;
  setSearchPackageFilter: (value: string) => void;
  searchSignatureFilter: string;
  setSearchSignatureFilter: (value: string) => void;
};

export function SymbolSearchPanel(props: SymbolSearchPanelProps) {
  const {
    searchQuery,
    setSearchQuery,
    runSearchNow,
    symbolSearching,
    searchKind,
    setSearchKind,
    searchPackageFilter,
    setSearchPackageFilter,
    searchSignatureFilter,
    setSearchSignatureFilter,
  } = props;

  return (
    <div className={styles.searchGroup}>
      <div className={styles.search}>
        <input
          type="text"
          placeholder="Search symbols..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') runSearchNow();
          }}
        />
        <button type="button" onClick={runSearchNow} disabled={symbolSearching}>
          {symbolSearching ? '...' : 'Search'}
        </button>
      </div>

      <div className={styles.filters}>
        <select value={searchKind} onChange={(event) => setSearchKind(event.target.value)}>
          <option value="">all kinds</option>
          <option value="function">function</option>
          <option value="type_decl">type</option>
          <option value="parameter">parameter</option>
          <option value="local">local</option>
        </select>

        <input
          value={searchPackageFilter}
          onChange={(event) => setSearchPackageFilter(event.target.value)}
          placeholder="pkg filter"
        />

        <input
          value={searchSignatureFilter}
          onChange={(event) => setSearchSignatureFilter(event.target.value)}
          placeholder="signature"
        />
      </div>
    </div>
  );
}
