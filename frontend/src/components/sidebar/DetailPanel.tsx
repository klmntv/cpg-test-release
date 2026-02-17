import type {
  CallGraphNode,
  DataflowNode,
  FunctionDetail,
  HotspotRow,
  ImpactRow,
  PackageFunction,
  QueryResult,
  Symbol,
  TypeInterfaceRow,
  TypeMethodRow,
  XrefRow,
} from '../../api';
import type { DataflowDirection, ViewMode } from '../../app/types';
import styles from './DetailPanel.module.css';

type DetailPanelProps = {
  viewMode: ViewMode;
  detail: FunctionDetail | null;
  runImpactForDetail: (functionID: string) => void;
  loadCallGraphByID: (id: string) => void;

  packageFunctionsLoading: boolean;
  packageFunctions: PackageFunction[];
  selectedPackage: string | null;

  callNodes: CallGraphNode[];

  dataflowDirection: DataflowDirection;
  dataflowNodes: DataflowNode[];
  dataflowEdgesCount: number;
  onDataflowNodeClick: (id: string) => void;

  hotspots: HotspotRow[];
  impactRows: ImpactRow[];

  typeInterfaces: TypeInterfaceRow[];
  selectedTypeName: string;
  typeMethods: TypeMethodRow[];

  queryResult: QueryResult | null;

  xrefs: XrefRow[];
  onOpenXref: (file: string, line: number) => void;

  symbols: Symbol[];
  onSymbolClick: (symbol: Symbol) => void;
};

export function DetailPanel(props: DetailPanelProps) {
  const {
    viewMode,
    detail,
    runImpactForDetail,
    loadCallGraphByID,
    packageFunctionsLoading,
    packageFunctions,
    selectedPackage,
    callNodes,
    dataflowDirection,
    dataflowNodes,
    dataflowEdgesCount,
    onDataflowNodeClick,
    hotspots,
    impactRows,
    typeInterfaces,
    selectedTypeName,
    typeMethods,
    queryResult,
    xrefs,
    onOpenXref,
    symbols,
    onSymbolClick,
  } = props;

  return (
    <>
      {detail && (
        <div>
          <div className={styles.detailRow}>
            <div className={styles.detailLabel}>Name</div>
            <div>{detail.name}</div>
          </div>

          <div className={styles.detailRow}>
            <div className={styles.detailLabel}>Package</div>
            <div>{detail.package}</div>
          </div>

          <div className={styles.detailRow}>
            <div className={styles.detailLabel}>Signature</div>
            <div>{detail.signature}</div>
          </div>

          <div className={styles.detailRow}>
            <div className={styles.detailLabel}>Complexity / LOC</div>
            <div>
              {detail.complexity} / {detail.loc}
            </div>
          </div>

          <div className={styles.detailRow}>
            <div className={styles.detailLabel}>Fan in / out</div>
            <div>
              {detail.fan_in} / {detail.fan_out}
            </div>
          </div>

          <div className={styles.detailActions}>
            <button type="button" onClick={() => runImpactForDetail(detail.function_id)}>
              Impact analysis
            </button>
            <button type="button" onClick={() => loadCallGraphByID(detail.function_id)}>
              Expand call graph
            </button>
          </div>
        </div>
      )}

      {viewMode === 'packages' && packageFunctionsLoading && <div className={styles.loading}>Loading functions...</div>}

      {viewMode === 'packages' && packageFunctions.length > 0 && (
        <ul className={styles.nodeList}>
          {packageFunctions.map((fn) => (
            <li key={fn.function_id} className={styles.nodeItem} onClick={() => loadCallGraphByID(fn.function_id)}>
              {fn.name}
              <small>function</small>
            </li>
          ))}
        </ul>
      )}

      {viewMode === 'packages' && selectedPackage && !packageFunctionsLoading && packageFunctions.length === 0 && (
        <div className={styles.loading}>No indexed functions in package: {selectedPackage}</div>
      )}

      {viewMode === 'calls' && callNodes.length > 0 && (
        <ul className={styles.nodeList}>
          {callNodes.map((node) => (
            <li key={node.id} className={styles.nodeItem} onClick={() => loadCallGraphByID(node.id)}>
              {node.name}
              <small>
                d={node.depth} · {node.package}
              </small>
            </li>
          ))}
        </ul>
      )}

      {viewMode === 'dataflow' && dataflowNodes.length > 0 && (
        <>
          <div className={styles.detailRow}>
            <div className={styles.detailLabel}>Slice</div>
            <div>
              {dataflowDirection} · {dataflowNodes.length} nodes / {dataflowEdgesCount} edges
            </div>
          </div>

          <ul className={styles.nodeList}>
            {dataflowNodes.slice(0, 220).map((node) => (
              <li key={node.id} className={styles.nodeItem} onClick={() => onDataflowNodeClick(node.id)}>
                {node.name || node.id}
                <small>
                  {node.kind} · d={node.depth}
                </small>
              </li>
            ))}
          </ul>
        </>
      )}

      {viewMode === 'hotspots' && hotspots.length > 0 && (
        <ul className={styles.nodeList}>
          {hotspots.map((hotspot) => (
            <li key={hotspot.function_id} className={styles.nodeItem} onClick={() => loadCallGraphByID(hotspot.function_id)}>
              {hotspot.name}
              <small>
                score={hotspot.hotspot_score.toFixed(2)} · {hotspot.package}
              </small>
            </li>
          ))}
        </ul>
      )}

      {viewMode === 'impact' && impactRows.length > 0 && (
        <ul className={styles.nodeList}>
          {impactRows.map((row) => (
            <li key={`${row.id}:${row.depth}`} className={styles.nodeItem} onClick={() => loadCallGraphByID(row.id)}>
              {row.name}
              <small>
                d={row.depth} · {row.package}
              </small>
            </li>
          ))}
        </ul>
      )}

      {viewMode === 'types' && (
        <>
          <div className={styles.detailRow}>
            <div className={styles.detailLabel}>Interfaces</div>
            <div>{typeInterfaces.length}</div>
          </div>

          {selectedTypeName && (
            <div className={styles.detailRow}>
              <div className={styles.detailLabel}>Selected Type</div>
              <div>{selectedTypeName}</div>
            </div>
          )}

          {typeMethods.length > 0 && (
            <ul className={styles.nodeList}>
              {typeMethods.slice(0, 220).map((method) => (
                <li key={method.method_id} className={styles.nodeItem} onClick={() => loadCallGraphByID(method.method_id)}>
                  {method.method_name}
                  <small>
                    c={method.complexity} loc={method.loc}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {viewMode === 'workbench' && queryResult && (
        <>
          <div className={styles.detailRow}>
            <div className={styles.detailLabel}>Query</div>
            <div>{queryResult.query}</div>
          </div>

          <div className={styles.detailRow}>
            <div className={styles.detailLabel}>Rows</div>
            <div>
              {queryResult.rows.length}
              {queryResult.truncated ? ' (truncated)' : ''}
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {Object.keys(queryResult.rows[0] || {})
                    .slice(0, 6)
                    .map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {queryResult.rows.slice(0, 60).map((row, idx) => (
                  <tr key={idx}>
                    {Object.values(row)
                      .slice(0, 6)
                      .map((value, colIdx) => (
                        <td key={colIdx}>{String(value ?? '')}</td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {xrefs.length > 0 && (
        <>
          <div className={styles.detailRow}>
            <div className={styles.detailLabel}>References</div>
            <div>{xrefs.length}</div>
          </div>

          <ul className={styles.nodeList}>
            {xrefs.slice(0, 120).map((xref) => (
              <li
                key={`${xref.use_id}:${xref.use_line}`}
                className={styles.nodeItem}
                onClick={() => onOpenXref(xref.use_file, xref.use_line)}
              >
                {xref.use_name}
                <small>
                  {xref.use_file}:{xref.use_line}
                </small>
              </li>
            ))}
          </ul>
        </>
      )}

      {symbols.length > 0 && (
        <ul className={styles.nodeList}>
          {symbols.map((symbol) => (
            <li key={symbol.id} className={styles.nodeItem} onClick={() => onSymbolClick(symbol)}>
              {symbol.name}
              <small>
                {symbol.kind} · {symbol.package}
              </small>
            </li>
          ))}
        </ul>
      )}

      {!detail &&
        !packageFunctionsLoading &&
        !packageFunctions.length &&
        !symbols.length &&
        !xrefs.length &&
        !callNodes.length &&
        !dataflowNodes.length &&
        !hotspots.length &&
        !impactRows.length &&
        !queryResult &&
        !typeInterfaces.length && <div className={styles.empty}>Select graph nodes or run a query.</div>}
    </>
  );
}
