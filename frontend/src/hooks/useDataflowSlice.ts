import { useCallback, useState } from 'react';
import { api } from '../api';
import type { DataflowEdge, DataflowNode, DataflowResponse } from '../api';
import type { DataflowDirection } from '../app/types';
import { clamp } from '../app/utils';

type UseDataflowSliceParams = {
  initialDirection?: DataflowDirection;
  initialMaxDepth?: number;
  initialRootID?: string | null;
  onBusy?: (message: string | null) => void;
  onError?: (message: string | null) => void;
};

export type DataflowSliceState = {
  dataflowNodes: DataflowNode[];
  dataflowEdges: DataflowEdge[];
  dataflowRootID: string | null;
  dataflowDirection: DataflowDirection;
  dataflowMaxDepth: number;
  setDataflowDirection: (direction: DataflowDirection) => void;
  setDataflowMaxDepth: (depth: number) => void;
  loadDataflowSlice: (nodeID: string, direction?: DataflowDirection) => Promise<DataflowResponse | null>;
  refreshDataflow: () => Promise<void>;
  clearDataflow: () => void;
};

export function useDataflowSlice(params: UseDataflowSliceParams = {}): DataflowSliceState {
  const {
    initialDirection = 'forward',
    initialMaxDepth = 14,
    initialRootID = null,
    onBusy,
    onError,
  } = params;

  const [dataflowNodes, setDataflowNodes] = useState<DataflowNode[]>([]);
  const [dataflowEdges, setDataflowEdges] = useState<DataflowEdge[]>([]);
  const [dataflowRootID, setDataflowRootID] = useState<string | null>(initialRootID);
  const [dataflowDirection, setDataflowDirectionState] = useState<DataflowDirection>(initialDirection);
  const [dataflowMaxDepth, setDataflowMaxDepthState] = useState(clamp(initialMaxDepth, 4, 40));

  const setDataflowDirection = (direction: DataflowDirection) => setDataflowDirectionState(direction);
  const setDataflowMaxDepth = (depth: number) => setDataflowMaxDepthState(clamp(depth, 4, 40));

  const loadDataflowSlice = useCallback(
    async (nodeID: string, direction = dataflowDirection) => {
      try {
        onError?.(null);
        onBusy?.('Loading data-flow slice...');
        setDataflowRootID(nodeID);
        setDataflowDirectionState(direction);

        const response = await api.getDataflowSlice(nodeID, direction, dataflowMaxDepth);
        setDataflowNodes(response.nodes || []);
        setDataflowEdges(response.edges || []);
        return response;
      } catch (err) {
        onError?.((err as Error).message);
        return null;
      } finally {
        onBusy?.(null);
      }
    },
    [dataflowDirection, dataflowMaxDepth, onBusy, onError]
  );

  const refreshDataflow = useCallback(async () => {
    if (!dataflowRootID) return;
    await loadDataflowSlice(dataflowRootID, dataflowDirection);
  }, [dataflowDirection, dataflowRootID, loadDataflowSlice]);

  const clearDataflow = useCallback(() => {
    setDataflowNodes([]);
    setDataflowEdges([]);
    setDataflowRootID(null);
  }, []);

  return {
    dataflowNodes,
    dataflowEdges,
    dataflowRootID,
    dataflowDirection,
    dataflowMaxDepth,
    setDataflowDirection,
    setDataflowMaxDepth,
    loadDataflowSlice,
    refreshDataflow,
    clearDataflow,
  };
}
