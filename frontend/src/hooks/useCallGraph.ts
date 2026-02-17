import { useCallback, useState } from 'react';
import { api } from '../api';
import type { CallGraphEdge, CallGraphNode, CallGraphResponse } from '../api';
import type { CallDirection } from '../app/types';
import { clamp } from '../app/utils';

type UseCallGraphParams = {
  initialDirection?: CallDirection;
  initialMaxDepth?: number;
  initialMaxNodes?: number;
  onBusy?: (message: string | null) => void;
  onError?: (message: string | null) => void;
};

export type LoadCallGraphOptions = {
  direction?: CallDirection;
  maxDepth?: number;
  maxNodes?: number;
};

export type CallGraphState = {
  callNodes: CallGraphNode[];
  callEdges: CallGraphEdge[];
  callRootID: string | null;
  callDirection: CallDirection;
  callMaxDepth: number;
  callMaxNodes: number;
  callTruncated: boolean;
  setCallDirection: (direction: CallDirection) => void;
  setCallMaxDepth: (depth: number) => void;
  setCallMaxNodes: (maxNodes: number) => void;
  loadCallGraph: (functionID: string, options?: LoadCallGraphOptions) => Promise<CallGraphResponse | null>;
  refreshCallGraph: () => Promise<void>;
  clearCallGraph: () => void;
};

export function useCallGraph(params: UseCallGraphParams = {}): CallGraphState {
  const {
    initialDirection = 'both',
    initialMaxDepth = 2,
    initialMaxNodes = 80,
    onBusy,
    onError,
  } = params;

  const [callNodes, setCallNodes] = useState<CallGraphNode[]>([]);
  const [callEdges, setCallEdges] = useState<CallGraphEdge[]>([]);
  const [callRootID, setCallRootID] = useState<string | null>(null);
  const [callDirection, setCallDirectionState] = useState<CallDirection>(initialDirection);
  const [callMaxDepth, setCallMaxDepthState] = useState(clamp(initialMaxDepth, 1, 8));
  const [callMaxNodes, setCallMaxNodesState] = useState(clamp(initialMaxNodes, 10, 250));
  const [callTruncated, setCallTruncated] = useState(false);

  const setCallDirection = (direction: CallDirection) => setCallDirectionState(direction);
  const setCallMaxDepth = (depth: number) => setCallMaxDepthState(clamp(depth, 1, 8));
  const setCallMaxNodes = (maxNodes: number) => setCallMaxNodesState(clamp(maxNodes, 10, 250));

  const loadCallGraph = useCallback(
    async (functionID: string, options: LoadCallGraphOptions = {}) => {
      const direction = options.direction ?? callDirection;
      const maxDepth = options.maxDepth ?? callMaxDepth;
      const maxNodes = options.maxNodes ?? callMaxNodes;

      try {
        onError?.(null);
        onBusy?.('Loading call graph...');

        const response = await api.getCallGraph(functionID, direction, maxDepth, maxNodes);
        setCallNodes(response.nodes || []);
        setCallEdges(response.edges || []);
        setCallRootID(response.center_id);
        setCallDirectionState(response.direction);
        setCallMaxDepthState(clamp(response.max_depth, 1, 8));
        setCallMaxNodesState(clamp(response.max_nodes, 10, 250));
        setCallTruncated((response.nodes || []).length >= response.max_nodes);
        return response;
      } catch (err) {
        const message = (err as Error).message;
        onError?.(message);
        return null;
      } finally {
        onBusy?.(null);
      }
    },
    [callDirection, callMaxDepth, callMaxNodes, onBusy, onError]
  );

  const refreshCallGraph = useCallback(async () => {
    if (!callRootID) return;
    await loadCallGraph(callRootID, {
      direction: callDirection,
      maxDepth: callMaxDepth,
      maxNodes: callMaxNodes,
    });
  }, [callDirection, callMaxDepth, callMaxNodes, callRootID, loadCallGraph]);

  const clearCallGraph = useCallback(() => {
    setCallNodes([]);
    setCallEdges([]);
    setCallRootID(null);
    setCallTruncated(false);
  }, []);

  return {
    callNodes,
    callEdges,
    callRootID,
    callDirection,
    callMaxDepth,
    callMaxNodes,
    callTruncated,
    setCallDirection,
    setCallMaxDepth,
    setCallMaxNodes,
    loadCallGraph,
    refreshCallGraph,
    clearCallGraph,
  };
}
