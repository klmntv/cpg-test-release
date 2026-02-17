import { useEffect, useState } from 'react';
import type { CallDirection } from '../../app/types';
import type { CallGraphNode } from '../../api';
import styles from './Controls.module.css';

type SeedFunction = {
  id: string;
  name: string;
  package?: string;
};

type CallsControlsProps = {
  callDirection: CallDirection;
  setCallDirection: (direction: CallDirection) => void;
  callMaxDepth: number;
  setCallMaxDepth: (depth: number) => void;
  callMaxNodes: number;
  setCallMaxNodes: (maxNodes: number) => void;
  callRootID: string | null;
  callTruncated: boolean;
  callEdgeCount: number;
  refreshCallGraph: () => void;
  loadDefaultCallGraph: () => void;
  seedFunctions: SeedFunction[];
  callNodes: CallGraphNode[];
  loadCallGraphByID: (id: string) => void;
};

export function CallsControls(props: CallsControlsProps) {
  const {
    callDirection,
    setCallDirection,
    callMaxDepth,
    setCallMaxDepth,
    callMaxNodes,
    setCallMaxNodes,
    callRootID,
    callTruncated,
    callEdgeCount,
    refreshCallGraph,
    loadDefaultCallGraph,
    seedFunctions,
    callNodes,
    loadCallGraphByID,
  } = props;

  const [selectedSeed, setSelectedSeed] = useState('');

  useEffect(() => {
    if (selectedSeed) return;
    const first = seedFunctions[0]?.id;
    if (first) setSelectedSeed(first);
  }, [seedFunctions, selectedSeed]);

  const increaseMaxNodes = () => {
    if (callMaxNodes >= 250) return;
    setCallMaxNodes(250);
    if (callRootID) {
      window.setTimeout(() => {
        refreshCallGraph();
      }, 0);
    }
  };

  return (
    <div className={`${styles.controls} ${styles.callsLayout}`}>
      <div className={styles.callsTopRow}>
        <div className={styles.callsGroup}>
          <span className={styles.groupTitle}>Scope</span>

          <label>
            Direction
            <select value={callDirection} onChange={(event) => setCallDirection(event.target.value as CallDirection)}>
              <option value="both">both</option>
              <option value="callers">callers</option>
              <option value="callees">callees</option>
            </select>
          </label>

          <label>
            Depth
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={callMaxDepth}
              onChange={(event) => setCallMaxDepth(Number(event.target.value))}
            />
            <span>{callMaxDepth}</span>
          </label>

          <label>
            Max nodes
            <input
              type="range"
              min={20}
              max={250}
              step={10}
              value={callMaxNodes}
              onChange={(event) => setCallMaxNodes(Number(event.target.value))}
            />
            <span>{callMaxNodes}</span>
          </label>
        </div>

        <div className={styles.callsGroup}>
          <span className={styles.groupTitle}>Actions</span>

          <button type="button" className={styles.primaryAction} disabled={!callRootID} onClick={refreshCallGraph}>
            Re-run graph
          </button>

          <button type="button" className={styles.secondaryAction} onClick={loadDefaultCallGraph}>
            Load default
          </button>

          {!callRootID && seedFunctions.length > 0 && (
            <>
              <label>
                Seed
                <select value={selectedSeed} onChange={(event) => setSelectedSeed(event.target.value)}>
                  {seedFunctions.map((seed) => (
                    <option key={seed.id} value={seed.id}>
                      {seed.name}
                    </option>
                  ))}
                </select>
              </label>

              <button type="button" className={styles.secondaryAction} disabled={!selectedSeed} onClick={() => selectedSeed && loadCallGraphByID(selectedSeed)}>
                Run seed
              </button>
            </>
          )}
        </div>

        <div className={styles.statusPill}>
          {callNodes.length} nodes · {callEdgeCount} edges
        </div>
      </div>

      <div className={styles.callsBottomRow}>
        {callRootID && callNodes.length > 0 && (
          <label className={styles.focusLabel}>
            Focus
            <select className={styles.focusSelect} value={callRootID} onChange={(event) => loadCallGraphByID(event.target.value)}>
              {callNodes.slice(0, 120).map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {callTruncated && (
          <div className={styles.inlineWarning}>
            <span className={styles.warn}>Result clipped by max nodes</span>
            {callMaxNodes < 250 && (
              <button type="button" className={styles.increaseBtn} onClick={increaseMaxNodes}>
                Increase
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
