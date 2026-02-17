import type { CallGraphNode, DataflowNode, ImpactRow } from '../../api';
import type { DataflowDirection, ModuleKey, ViewMode } from '../../app/types';
import styles from './ContextTrail.module.css';

type TrailItem = {
  label: string;
  value: string;
  onClick?: () => void;
  tone?: 'default' | 'busy';
};

type ContextTrailProps = {
  viewMode: ViewMode;

  selectedPackage: string | null;
  packageModuleFilter: ModuleKey | 'all';

  callRootID: string | null;
  callNodes: CallGraphNode[];
  callEdgeCount: number;

  dataflowRootID: string | null;
  dataflowDirection: DataflowDirection;
  dataflowNodes: DataflowNode[];

  impactRootID: string | null;
  impactRows: ImpactRow[];

  selectedTypeName: string;
  typeInterfacesCount: number;

  selectedQueryName: string;
  queryRowsCount: number;

  sourceFile: string | null;
  activeLine: number | null;

  busy: string | null;

  onOpenCallByID: (id: string) => void;
  onSwitchToSource: () => void;
};

function titleCase(mode: ViewMode): string {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

function shortName(value: string): string {
  if (value.length <= 72) return value;
  return `${value.slice(0, 34)}...${value.slice(-26)}`;
}

export function ContextTrail(props: ContextTrailProps) {
  const {
    viewMode,
    selectedPackage,
    packageModuleFilter,
    callRootID,
    callNodes,
    callEdgeCount,
    dataflowRootID,
    dataflowDirection,
    dataflowNodes,
    impactRootID,
    impactRows,
    selectedTypeName,
    typeInterfacesCount,
    selectedQueryName,
    queryRowsCount,
    sourceFile,
    activeLine,
    busy,
    onOpenCallByID,
    onSwitchToSource,
  } = props;

  const items: TrailItem[] = [{ label: 'View', value: titleCase(viewMode) }];

  if (viewMode === 'packages') {
    if (packageModuleFilter !== 'all') {
      items.push({ label: 'Module', value: packageModuleFilter });
    }
    if (selectedPackage) {
      items.push({ label: 'Package', value: shortName(selectedPackage) });
    }
  }

  if (viewMode === 'calls') {
    if (callRootID) {
      const root = callNodes.find((node) => node.id === callRootID);
      items.push({
        label: 'Root',
        value: shortName(root?.name || callRootID),
        onClick: () => onOpenCallByID(callRootID),
      });
    }

    if (callNodes.length > 0) {
      items.push({ label: 'Graph', value: `${callNodes.length}n / ${callEdgeCount}e` });
    }
  }

  if (viewMode === 'dataflow') {
    items.push({ label: 'Direction', value: dataflowDirection });

    if (dataflowRootID) {
      const root = dataflowNodes.find((node) => node.id === dataflowRootID);
      items.push({ label: 'Node', value: shortName(root?.name || dataflowRootID) });
    }
  }

  if (viewMode === 'impact') {
    if (impactRootID) {
      const root = impactRows.find((row) => row.id === impactRootID);
      items.push({ label: 'Root', value: shortName(root?.name || impactRootID) });
    }
    if (impactRows.length > 0) {
      items.push({ label: 'Reach', value: String(impactRows.length) });
    }
  }

  if (viewMode === 'types') {
    if (selectedTypeName) items.push({ label: 'Type', value: selectedTypeName });
    else items.push({ label: 'Interfaces', value: String(typeInterfacesCount) });
  }

  if (viewMode === 'workbench') {
    if (selectedQueryName) items.push({ label: 'Query', value: selectedQueryName });
    if (queryRowsCount > 0) items.push({ label: 'Rows', value: String(queryRowsCount) });
  }

  if (sourceFile) {
    const fileValue = activeLine ? `${sourceFile}:${activeLine}` : sourceFile;
    items.push({
      label: 'File',
      value: shortName(fileValue),
      onClick: onSwitchToSource,
    });
  }

  if (busy) {
    items.push({ label: 'Status', value: busy, tone: 'busy' });
  }

  return (
    <div className={styles.trail} role="navigation" aria-label="Context trail">
      {items.map((item, idx) => {
        const common = (
          <>
            <span className={styles.label}>{item.label}</span>
            <span className={styles.value} title={item.value}>
              {item.value}
            </span>
          </>
        );

        return (
          <div key={`${item.label}:${idx}`} style={{ display: 'inline-flex', alignItems: 'center', minWidth: 0 }}>
            {idx > 0 && <span className={styles.separator}>/</span>}
            {item.onClick ? (
              <button type="button" className={styles.segmentButton} onClick={item.onClick}>
                {common}
              </button>
            ) : (
              <span className={`${styles.segment} ${item.tone === 'busy' ? styles.busy : ''}`}>{common}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
