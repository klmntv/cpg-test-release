package server

import (
	"encoding/json"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"

	"zombiezen.com/go/sqlite"
	"zombiezen.com/go/sqlite/sqlitex"
)

// Server serves read-only CPG API.
type Server struct {
	pool *sqlitex.Pool
	mu   sync.RWMutex
}

// New opens the database and returns a Server. Caller must call Close().
func New(dbPath string) (*Server, error) {
	pool, err := sqlitex.Open(dbPath, sqlite.OpenReadOnly, 2)
	if err != nil {
		return nil, err
	}
	return &Server{pool: pool}, nil
}

// Close releases the connection pool.
func (s *Server) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.pool != nil {
		s.pool.Close()
		s.pool = nil
	}
	return nil
}

// conn returns a connection from the pool. Caller must release it.
func (s *Server) conn() (*sqlite.Conn, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.pool == nil {
		return nil, http.ErrHandlerTimeout
	}
	return s.pool.Get(nil), nil
}

// ServeHTTP implements http.Handler.
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	switch {
	case r.URL.Path == "/queries" || r.URL.Path == "/queries/":
		s.handleQueries(w, r)
	case r.URL.Path == "/graph/package":
		s.handleGraphPackage(w, r)
	case r.URL.Path == "/graph/neighborhood":
		s.handleGraphNeighborhood(w, r)
	case r.URL.Path == "/graph/call":
		s.handleGraphCall(w, r)
	case r.URL.Path == "/graph/dataflow":
		s.handleGraphDataflow(w, r)
	case r.URL.Path == "/source":
		s.handleSource(w, r)
	case r.URL.Path == "/symbols":
		s.handleSymbols(w, r)
	case r.URL.Path == "/hotspots":
		s.handleHotspots(w, r)
	case r.URL.Path == "/impact":
		s.handleImpact(w, r)
	case r.URL.Path == "/types/interfaces":
		s.handleTypeInterfaces(w, r)
	case r.URL.Path == "/types/methods":
		s.handleTypeMethods(w, r)
	case r.URL.Path == "/types/hierarchy":
		s.handleTypeHierarchy(w, r)
	case r.URL.Path == "/xrefs":
		s.handleXrefs(w, r)
	case r.URL.Path == "/file/outline":
		s.handleFileOutline(w, r)
	case r.URL.Path == "/functions":
		s.handleFunctionsByPackage(w, r)
	case len(r.URL.Path) > 10 && r.URL.Path[:10] == "/function/":
		s.handleFunctionDetail(w, r, r.URL.Path[10:])
	case len(r.URL.Path) > 7 && r.URL.Path[:7] == "/query/":
		s.handleQueryByName(w, r, r.URL.Path[7:])
	default:
		http.NotFound(w, r)
	}
}

func (s *Server) writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func (s *Server) writeErr(w http.ResponseWriter, status int, msg string) {
	s.writeJSON(w, status, map[string]string{"error": msg})
}

func (s *Server) handleQueries(w http.ResponseWriter, r *http.Request) {
	conn, err := s.conn()
	if err != nil {
		s.writeErr(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	defer s.pool.Put(conn)

	stmt, err := conn.Prepare("SELECT name, description FROM queries ORDER BY name")
	if err != nil {
		s.writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer stmt.Finalize()

	var list []struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	for {
		if ok, err := stmt.Step(); err != nil {
			s.writeErr(w, http.StatusInternalServerError, err.Error())
			return
		} else if !ok {
			break
		}
		list = append(list, struct {
			Name        string `json:"name"`
			Description string `json:"description"`
		}{
			stmt.GetText("name"),
			stmt.GetText("description"),
		})
	}
	s.writeJSON(w, http.StatusOK, list)
}

func (s *Server) handleGraphPackage(w http.ResponseWriter, r *http.Request) {
	conn, err := s.conn()
	if err != nil {
		s.writeErr(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	defer s.pool.Put(conn)

	// Nodes from dashboard_package_treemap
	stmt, err := conn.Prepare("SELECT package, file_count, function_count, total_loc, total_complexity, avg_complexity, max_complexity FROM dashboard_package_treemap ORDER BY package")
	if err != nil {
		s.writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer stmt.Finalize()

	type pkgNode struct {
		Package         string  `json:"id"`
		FileCount       int     `json:"file_count"`
		FunctionCount   int     `json:"function_count"`
		TotalLoc        int     `json:"total_loc"`
		TotalComplexity int     `json:"total_complexity"`
		AvgComplexity   float64 `json:"avg_complexity"`
		MaxComplexity   int     `json:"max_complexity"`
	}
	var nodes []pkgNode
	for {
		if ok, err := stmt.Step(); err != nil {
			s.writeErr(w, http.StatusInternalServerError, err.Error())
			return
		} else if !ok {
			break
		}
		nodes = append(nodes, pkgNode{
			Package:         stmt.GetText("package"),
			FileCount:       stmt.ColumnInt(stmt.ColumnIndex("file_count")),
			FunctionCount:   stmt.ColumnInt(stmt.ColumnIndex("function_count")),
			TotalLoc:        stmt.ColumnInt(stmt.ColumnIndex("total_loc")),
			TotalComplexity: stmt.ColumnInt(stmt.ColumnIndex("total_complexity")),
			AvgComplexity:   stmt.ColumnFloat(stmt.ColumnIndex("avg_complexity")),
			MaxComplexity:   stmt.ColumnInt(stmt.ColumnIndex("max_complexity")),
		})
	}

	// Edges from dashboard_package_graph
	stmt2, err := conn.Prepare("SELECT source, target, weight FROM dashboard_package_graph ORDER BY weight DESC")
	if err != nil {
		s.writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer stmt2.Finalize()

	type edge struct {
		Source string `json:"source"`
		Target string `json:"target"`
		Weight int    `json:"weight"`
	}
	var edges []edge
	for {
		if ok, err := stmt2.Step(); err != nil {
			s.writeErr(w, http.StatusInternalServerError, err.Error())
			return
		} else if !ok {
			break
		}
		edges = append(edges, edge{
			Source: stmt2.GetText("source"),
			Target: stmt2.GetText("target"),
			Weight: stmt2.ColumnInt(stmt2.ColumnIndex("weight")),
		})
	}

	s.writeJSON(w, http.StatusOK, map[string]any{"nodes": nodes, "edges": edges})
}

func (s *Server) handleGraphNeighborhood(w http.ResponseWriter, r *http.Request) {
	functionID := r.URL.Query().Get("function_id")
	if functionID == "" {
		s.writeErr(w, http.StatusBadRequest, "missing function_id")
		return
	}

	conn, err := s.conn()
	if err != nil {
		s.writeErr(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	defer s.pool.Put(conn)

	// function_neighborhood: callers and callees
	stmt, err := conn.Prepare(`SELECT 'caller' AS direction, n.id, n.name, n.package, n.file, n.line
  FROM edges e JOIN nodes n ON n.id = e.source
  WHERE e.target = ? AND e.kind = 'call' AND n.kind = 'function'
  UNION ALL
  SELECT 'callee' AS direction, n.id, n.name, n.package, n.file, n.line
  FROM edges e JOIN nodes n ON n.id = e.target
  WHERE e.source = ? AND e.kind = 'call' AND n.kind = 'function'
  ORDER BY direction, name`)
	if err != nil {
		s.writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer stmt.Finalize()
	stmt.BindText(1, functionID)
	stmt.BindText(2, functionID)

	type neighbor struct {
		Direction string `json:"direction"`
		ID        string `json:"id"`
		Name      string `json:"name"`
		Package   string `json:"package"`
		File      string `json:"file"`
		Line      int    `json:"line"`
	}
	var list []neighbor
	for {
		if ok, err := stmt.Step(); err != nil {
			s.writeErr(w, http.StatusInternalServerError, err.Error())
			return
		} else if !ok {
			break
		}
		list = append(list, neighbor{
			Direction: stmt.GetText("direction"),
			ID:        stmt.GetText("id"),
			Name:      stmt.GetText("name"),
			Package:   stmt.GetText("package"),
			File:      stmt.GetText("file"),
			Line:      stmt.ColumnInt(stmt.ColumnIndex("line")),
		})
	}

	// Include center node (function_id) for display
	stmt2, err := conn.Prepare("SELECT id, name, package, file, line FROM nodes WHERE id = ? AND kind = 'function'")
	if err != nil {
		s.writeJSON(w, http.StatusOK, map[string]any{"center": functionID, "neighbors": list})
		return
	}
	defer stmt2.Finalize()
	stmt2.BindText(1, functionID)
	var center *neighbor
	if ok, _ := stmt2.Step(); ok {
		center = &neighbor{
			ID: stmt2.GetText("id"), Name: stmt2.GetText("name"),
			Package: stmt2.GetText("package"), File: stmt2.GetText("file"),
			Line: stmt2.ColumnInt(stmt2.ColumnIndex("line")),
		}
	}

	s.writeJSON(w, http.StatusOK, map[string]any{"center": center, "neighbors": list})
}

func clampInt(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

func parseIntQuery(q map[string][]string, key string, fallback, lo, hi int) (int, error) {
	raw := ""
	if vs, ok := q[key]; ok && len(vs) > 0 {
		raw = vs[0]
	}
	if raw == "" {
		return fallback, nil
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		return 0, err
	}
	return clampInt(n, lo, hi), nil
}

func (s *Server) handleGraphCall(w http.ResponseWriter, r *http.Request) {
	functionID := r.URL.Query().Get("function_id")
	if functionID == "" {
		s.writeErr(w, http.StatusBadRequest, "missing function_id")
		return
	}
	direction := r.URL.Query().Get("direction")
	if direction == "" {
		direction = "both"
	}
	if direction != "both" && direction != "callers" && direction != "callees" {
		s.writeErr(w, http.StatusBadRequest, "direction must be both, callers, or callees")
		return
	}
	maxDepth, err := parseIntQuery(r.URL.Query(), "max_depth", 2, 1, 8)
	if err != nil {
		s.writeErr(w, http.StatusBadRequest, "invalid max_depth")
		return
	}
	maxNodes, err := parseIntQuery(r.URL.Query(), "max_nodes", 80, 10, 250)
	if err != nil {
		s.writeErr(w, http.StatusBadRequest, "invalid max_nodes")
		return
	}

	conn, err := s.conn()
	if err != nil {
		s.writeErr(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	defer s.pool.Put(conn)

	type nodeRow struct {
		ID      string `json:"id"`
		Name    string `json:"name"`
		Package string `json:"package"`
		File    string `json:"file"`
		Line    int    `json:"line"`
		Depth   int    `json:"depth"`
	}
	type edgeRow struct {
		Source string `json:"source"`
		Target string `json:"target"`
		Kind   string `json:"kind"`
	}

	stmtOutgoing, err := conn.Prepare("SELECT target FROM edges WHERE source = ?1 AND kind = 'call'")
	if err != nil {
		s.writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer stmtOutgoing.Finalize()

	stmtIncoming, err := conn.Prepare("SELECT source FROM edges WHERE target = ?1 AND kind = 'call'")
	if err != nil {
		s.writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer stmtIncoming.Finalize()

	stmtNode, err := conn.Prepare("SELECT id, name, package, file, line FROM nodes WHERE id = ?1 AND kind = 'function'")
	if err != nil {
		s.writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer stmtNode.Finalize()

	queryOneCol := func(stmt *sqlite.Stmt, id string, column string) ([]string, error) {
		if err := stmt.Reset(); err != nil {
			return nil, err
		}
		if err := stmt.ClearBindings(); err != nil {
			return nil, err
		}
		stmt.BindText(1, id)

		out := make([]string, 0, 16)
		for {
			ok, err := stmt.Step()
			if err != nil {
				return nil, err
			}
			if !ok {
				break
			}
			out = append(out, stmt.GetText(column))
		}
		return out, nil
	}

	depthByID := map[string]int{functionID: 0}
	frontier := []string{functionID}
	edgeSet := make(map[string]edgeRow, maxNodes*4)
	addEdge := func(source, target string) {
		if _, ok := depthByID[source]; !ok {
			return
		}
		if _, ok := depthByID[target]; !ok {
			return
		}
		key := source + "\x00" + target
		edgeSet[key] = edgeRow{
			Source: source,
			Target: target,
			Kind:   "call",
		}
	}
	addNode := func(id string, depth int, next *[]string) {
		if _, exists := depthByID[id]; exists {
			return
		}
		if len(depthByID) >= maxNodes {
			return
		}
		depthByID[id] = depth
		*next = append(*next, id)
	}

	for depth := 0; depth < maxDepth && len(frontier) > 0; depth++ {
		next := make([]string, 0, len(frontier)*2)
		for _, id := range frontier {
			if direction == "callees" || direction == "both" {
				targets, err := queryOneCol(stmtOutgoing, id, "target")
				if err != nil {
					s.writeErr(w, http.StatusInternalServerError, err.Error())
					return
				}
				for _, target := range targets {
					addNode(target, depth+1, &next)
					addEdge(id, target)
				}
			}

			if direction == "callers" || direction == "both" {
				sources, err := queryOneCol(stmtIncoming, id, "source")
				if err != nil {
					s.writeErr(w, http.StatusInternalServerError, err.Error())
					return
				}
				for _, source := range sources {
					addNode(source, depth+1, &next)
					addEdge(source, id)
				}
			}
		}
		frontier = next
	}

	nodes := make([]nodeRow, 0, len(depthByID))
	for id, depth := range depthByID {
		if err := stmtNode.Reset(); err != nil {
			s.writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		if err := stmtNode.ClearBindings(); err != nil {
			s.writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		stmtNode.BindText(1, id)
		ok, err := stmtNode.Step()
		if err != nil {
			s.writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		if ok {
			nodes = append(nodes, nodeRow{
				ID:      stmtNode.GetText("id"),
				Name:    stmtNode.GetText("name"),
				Package: stmtNode.GetText("package"),
				File:    stmtNode.GetText("file"),
				Line:    stmtNode.ColumnInt(stmtNode.ColumnIndex("line")),
				Depth:   depth,
			})
			continue
		}

		// Keep center node visible even if metadata is missing.
		if id == functionID {
			nodes = append(nodes, nodeRow{
				ID:    functionID,
				Name:  functionID,
				Depth: 0,
			})
		}
	}

	sort.Slice(nodes, func(i, j int) bool {
		if nodes[i].Depth != nodes[j].Depth {
			return nodes[i].Depth < nodes[j].Depth
		}
		if nodes[i].Name != nodes[j].Name {
			return nodes[i].Name < nodes[j].Name
		}
		return nodes[i].ID < nodes[j].ID
	})

	edges := make([]edgeRow, 0, len(edgeSet))
	for _, edge := range edgeSet {
		edges = append(edges, edge)
	}
	sort.Slice(edges, func(i, j int) bool {
		if edges[i].Source != edges[j].Source {
			return edges[i].Source < edges[j].Source
		}
		if edges[i].Target != edges[j].Target {
			return edges[i].Target < edges[j].Target
		}
		return edges[i].Kind < edges[j].Kind
	})

	s.writeJSON(w, http.StatusOK, map[string]any{
		"center_id": functionID,
		"direction": direction,
		"max_depth": maxDepth,
		"max_nodes": maxNodes,
		"nodes":     nodes,
		"edges":     edges,
	})
}

func (s *Server) handleGraphDataflow(w http.ResponseWriter, r *http.Request) {
	nodeID := r.URL.Query().Get("node_id")
	if nodeID == "" {
		s.writeErr(w, http.StatusBadRequest, "missing node_id")
		return
	}
	direction := r.URL.Query().Get("direction")
	if direction == "" {
		direction = "forward"
	}
	if direction != "forward" && direction != "backward" {
		s.writeErr(w, http.StatusBadRequest, "direction must be forward or backward")
		return
	}
	maxDepth := 14
	if d := r.URL.Query().Get("max_depth"); d != "" {
		n, err := strconv.Atoi(d)
		if err != nil || n < 1 || n > 40 {
			s.writeErr(w, http.StatusBadRequest, "max_depth must be between 1 and 40")
			return
		}
		maxDepth = n
	}

	conn, err := s.conn()
	if err != nil {
		s.writeErr(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	defer s.pool.Put(conn)

	type sliceNode struct {
		ID      string `json:"id"`
		Name    string `json:"name"`
		Kind    string `json:"kind"`
		Package string `json:"package"`
		File    string `json:"file"`
		Line    int    `json:"line"`
		Depth   int    `json:"depth"`
	}
	type sliceEdge struct {
		Source string `json:"source"`
		Target string `json:"target"`
		Kind   string `json:"kind"`
	}

	nodeSQL := `WITH RECURSIVE slice(id, depth) AS (
  SELECT ?1, 0
  UNION
  SELECT e.target, s.depth + 1
  FROM slice s JOIN edges e ON e.source = s.id
  WHERE e.kind IN ('dfg', 'param_out') AND s.depth < ?2
)
SELECT n.id, n.name, n.kind, n.package, n.file, n.line, MIN(slice.depth) AS depth
FROM slice JOIN nodes n ON n.id = slice.id
GROUP BY n.id, n.name, n.kind, n.package, n.file, n.line
ORDER BY depth, n.file, n.line`
	edgeSQL := `WITH RECURSIVE slice(id, depth) AS (
  SELECT ?1, 0
  UNION
  SELECT e.target, s.depth + 1
  FROM slice s JOIN edges e ON e.source = s.id
  WHERE e.kind IN ('dfg', 'param_out') AND s.depth < ?2
)
SELECT DISTINCT e.source, e.target, e.kind
FROM edges e
JOIN slice src ON src.id = e.source
JOIN slice dst ON dst.id = e.target
WHERE e.kind IN ('dfg', 'param_in', 'param_out')`

	if direction == "backward" {
		nodeSQL = `WITH RECURSIVE slice(id, depth) AS (
  SELECT ?1, 0
  UNION
  SELECT e.source, s.depth + 1
  FROM slice s JOIN edges e ON e.target = s.id
  WHERE e.kind IN ('dfg', 'param_in') AND s.depth < ?2
)
SELECT n.id, n.name, n.kind, n.package, n.file, n.line, MIN(slice.depth) AS depth
FROM slice JOIN nodes n ON n.id = slice.id
GROUP BY n.id, n.name, n.kind, n.package, n.file, n.line
ORDER BY depth, n.file, n.line`
		edgeSQL = `WITH RECURSIVE slice(id, depth) AS (
  SELECT ?1, 0
  UNION
  SELECT e.source, s.depth + 1
  FROM slice s JOIN edges e ON e.target = s.id
  WHERE e.kind IN ('dfg', 'param_in') AND s.depth < ?2
)
SELECT DISTINCT e.source, e.target, e.kind
FROM edges e
JOIN slice src ON src.id = e.source
JOIN slice dst ON dst.id = e.target
WHERE e.kind IN ('dfg', 'param_in', 'param_out')`
	}

	stmt, err := conn.Prepare(nodeSQL)
	if err != nil {
		s.writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer stmt.Finalize()
	stmt.BindText(1, nodeID)
	stmt.BindInt64(2, int64(maxDepth))

	nodes := make([]sliceNode, 0, 256)
	for {
		ok, err := stmt.Step()
		if err != nil {
			s.writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		if !ok {
			break
		}
		nodes = append(nodes, sliceNode{
			ID:      stmt.GetText("id"),
			Name:    stmt.GetText("name"),
			Kind:    stmt.GetText("kind"),
			Package: stmt.GetText("package"),
			File:    stmt.GetText("file"),
			Line:    stmt.ColumnInt(stmt.ColumnIndex("line")),
			Depth:   stmt.ColumnInt(stmt.ColumnIndex("depth")),
		})
	}

	stmt2, err := conn.Prepare(edgeSQL)
	if err != nil {
		s.writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer stmt2.Finalize()
	stmt2.BindText(1, nodeID)
	stmt2.BindInt64(2, int64(maxDepth))

	edges := make([]sliceEdge, 0, 512)
	for {
		ok, err := stmt2.Step()
		if err != nil {
			s.writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		if !ok {
			break
		}
		edges = append(edges, sliceEdge{
			Source: stmt2.GetText("source"),
			Target: stmt2.GetText("target"),
			Kind:   stmt2.GetText("kind"),
		})
	}

	s.writeJSON(w, http.StatusOK, map[string]any{
		"root_id":   nodeID,
		"direction": direction,
		"nodes":     nodes,
		"edges":     edges,
	})
}

func (s *Server) handleSource(w http.ResponseWriter, r *http.Request) {
	file := r.URL.Query().Get("file")
	if file == "" {
		s.writeErr(w, http.StatusBadRequest, "missing file")
		return
	}

	conn, err := s.conn()
	if err != nil {
		s.writeErr(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	defer s.pool.Put(conn)

	stmt, err := conn.Prepare("SELECT content FROM sources WHERE file = ?")
	if err != nil {
		s.writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer stmt.Finalize()
	stmt.BindText(1, file)
	if ok, err := stmt.Step(); err != nil {
		s.writeErr(w, http.StatusInternalServerError, err.Error())
		return
	} else if !ok {
		s.writeErr(w, http.StatusNotFound, "file not found")
		return
	}
	s.writeJSON(w, http.StatusOK, map[string]string{"file": file, "content": stmt.GetText("content")})
}

func (s *Server) handleFunctionsByPackage(w http.ResponseWriter, r *http.Request) {
	pkg := r.URL.Query().Get("package")
	if pkg == "" {
		s.writeErr(w, http.StatusBadRequest, "missing package")
		return
	}

	conn, err := s.conn()
	if err != nil {
		s.writeErr(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	defer s.pool.Put(conn)

	stmt, err := conn.Prepare("SELECT function_id, name FROM dashboard_function_detail WHERE package = ? ORDER BY name LIMIT 200")
	if err != nil {
		s.writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer stmt.Finalize()
	stmt.BindText(1, pkg)

	type fn struct {
		FunctionID string `json:"function_id"`
		Name       string `json:"name"`
	}
	var list []fn
	for {
		if ok, err := stmt.Step(); err != nil {
			s.writeErr(w, http.StatusInternalServerError, err.Error())
			return
		} else if !ok {
			break
		}
		list = append(list, fn{
			FunctionID: stmt.GetText("function_id"),
			Name:       stmt.GetText("name"),
		})
	}
	s.writeJSON(w, http.StatusOK, list)
}

func (s *Server) handleSymbols(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		s.writeErr(w, http.StatusBadRequest, "missing q")
		return
	}
	pattern := "%" + q + "%"
	limit, err := parseIntQuery(r.URL.Query(), "limit", 50, 1, 200)
	if err != nil {
		s.writeErr(w, http.StatusBadRequest, "invalid limit")
		return
	}
	kind := strings.TrimSpace(r.URL.Query().Get("kind"))
	pkg := strings.TrimSpace(r.URL.Query().Get("package"))
	signature := strings.TrimSpace(r.URL.Query().Get("signature"))
	pkgPattern := ""
	if pkg != "" {
		pkgPattern = "%" + pkg + "%"
	}
	signaturePattern := ""
	if signature != "" {
		signaturePattern = "%" + signature + "%"
	}

	conn, err := s.conn()
	if err != nil {
		s.writeErr(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	defer s.pool.Put(conn)

	query := `SELECT s.id, s.name, s.kind, s.package, s.file, s.line
FROM symbol_index s
WHERE s.name LIKE ?1
  AND (?2 = '' OR s.kind = ?2)
  AND (?3 = '' OR s.package LIKE ?3)
  AND (
    ?4 = ''
    OR EXISTS (
      SELECT 1
      FROM dashboard_function_detail d
      WHERE d.function_id = s.id AND d.signature LIKE ?4
    )
    OR EXISTS (
      SELECT 1
      FROM file_outline f
      WHERE f.id = s.id AND f.signature LIKE ?4
    )
  )
ORDER BY s.kind, s.name
LIMIT ?5`
	stmt, err := conn.Prepare(query)
	if err != nil {
		s.writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer stmt.Finalize()
	stmt.BindText(1, pattern)
	stmt.BindText(2, kind)
	stmt.BindText(3, pkgPattern)
	stmt.BindText(4, signaturePattern)
	stmt.BindInt64(5, int64(limit))

	type sym struct {
		ID      string `json:"id"`
		Name    string `json:"name"`
		Kind    string `json:"kind"`
		Package string `json:"package"`
		File    string `json:"file"`
		Line    int    `json:"line"`
	}
	var list []sym
	for {
		if ok, err := stmt.Step(); err != nil {
			s.writeErr(w, http.StatusInternalServerError, err.Error())
			return
		} else if !ok {
			break
		}
		list = append(list, sym{
			ID:      stmt.GetText("id"),
			Name:    stmt.GetText("name"),
			Kind:    stmt.GetText("kind"),
			Package: stmt.GetText("package"),
			File:    stmt.GetText("file"),
			Line:    stmt.ColumnInt(stmt.ColumnIndex("line")),
		})
	}
	s.writeJSON(w, http.StatusOK, list)
}

func (s *Server) handleHotspots(w http.ResponseWriter, r *http.Request) {
	limit, err := parseIntQuery(r.URL.Query(), "limit", 50, 1, 300)
	if err != nil {
		s.writeErr(w, http.StatusBadRequest, "invalid limit")
		return
	}
	conn, err := s.conn()
	if err != nil {
		s.writeErr(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	defer s.pool.Put(conn)

	stmt, err := conn.Prepare("SELECT function_id, name, package, file, complexity, loc, fan_in, fan_out, finding_count, hotspot_score FROM dashboard_hotspots ORDER BY hotspot_score DESC LIMIT ?1")
	if err != nil {
		s.writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer stmt.Finalize()
	stmt.BindInt64(1, int64(limit))

	var rows []map[string]any
	for {
		ok, err := stmt.Step()
		if err != nil {
			s.writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		if !ok {
			break
		}
		rows = append(rows, map[string]any{
			"function_id":   stmt.GetText("function_id"),
			"name":          stmt.GetText("name"),
			"package":       stmt.GetText("package"),
			"file":          stmt.GetText("file"),
			"complexity":    stmt.ColumnInt(stmt.ColumnIndex("complexity")),
			"loc":           stmt.ColumnInt(stmt.ColumnIndex("loc")),
			"fan_in":        stmt.ColumnInt(stmt.ColumnIndex("fan_in")),
			"fan_out":       stmt.ColumnInt(stmt.ColumnIndex("fan_out")),
			"finding_count": stmt.ColumnInt(stmt.ColumnIndex("finding_count")),
			"hotspot_score": stmt.ColumnFloat(stmt.ColumnIndex("hotspot_score")),
		})
	}
	s.writeJSON(w, http.StatusOK, rows)
}

func (s *Server) handleImpact(w http.ResponseWriter, r *http.Request) {
	functionID := strings.TrimSpace(r.URL.Query().Get("function_id"))
	if functionID == "" {
		s.writeErr(w, http.StatusBadRequest, "missing function_id")
		return
	}
	maxDepth, err := parseIntQuery(r.URL.Query(), "max_depth", 8, 1, 12)
	if err != nil {
		s.writeErr(w, http.StatusBadRequest, "invalid max_depth")
		return
	}
	limit, err := parseIntQuery(r.URL.Query(), "limit", 250, 1, 500)
	if err != nil {
		s.writeErr(w, http.StatusBadRequest, "invalid limit")
		return
	}

	conn, err := s.conn()
	if err != nil {
		s.writeErr(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	defer s.pool.Put(conn)

	stmt, err := conn.Prepare(`WITH RECURSIVE callers(id, depth) AS (
  SELECT ?1, 0
  UNION
  SELECT e.source, c.depth + 1
  FROM callers c
  JOIN edges e ON e.target = c.id AND e.kind = 'call'
  WHERE c.depth < ?2
)
SELECT DISTINCT n.id, n.name, n.package, n.file, n.line, c.depth
FROM callers c JOIN nodes n ON n.id = c.id
WHERE n.kind = 'function'
ORDER BY c.depth, n.package, n.name
LIMIT ?3`)
	if err != nil {
		s.writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer stmt.Finalize()
	stmt.BindText(1, functionID)
	stmt.BindInt64(2, int64(maxDepth))
	stmt.BindInt64(3, int64(limit))

	var rows []map[string]any
	for {
		ok, err := stmt.Step()
		if err != nil {
			s.writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		if !ok {
			break
		}
		rows = append(rows, map[string]any{
			"id":      stmt.GetText("id"),
			"name":    stmt.GetText("name"),
			"package": stmt.GetText("package"),
			"file":    stmt.GetText("file"),
			"line":    stmt.ColumnInt(stmt.ColumnIndex("line")),
			"depth":   stmt.ColumnInt(stmt.ColumnIndex("depth")),
		})
	}
	s.writeJSON(w, http.StatusOK, rows)
}

func (s *Server) handleTypeInterfaces(w http.ResponseWriter, r *http.Request) {
	name := strings.TrimSpace(r.URL.Query().Get("name"))
	limit, err := parseIntQuery(r.URL.Query(), "limit", 200, 1, 500)
	if err != nil {
		s.writeErr(w, http.StatusBadRequest, "invalid limit")
		return
	}
	conn, err := s.conn()
	if err != nil {
		s.writeErr(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	defer s.pool.Put(conn)

	stmtText := `SELECT interface_id, interface_name, interface_package, concrete_id, concrete_name, concrete_package, method_count
FROM type_impl_map
WHERE (?1 = '' OR interface_name LIKE ?2)
ORDER BY interface_name, concrete_package, concrete_name
LIMIT ?3`
	stmt, err := conn.Prepare(stmtText)
	if err != nil {
		s.writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer stmt.Finalize()
	stmt.BindText(1, name)
	stmt.BindText(2, "%"+name+"%")
	stmt.BindInt64(3, int64(limit))

	var rows []map[string]any
	for {
		ok, err := stmt.Step()
		if err != nil {
			s.writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		if !ok {
			break
		}
		rows = append(rows, map[string]any{
			"interface_id":      stmt.GetText("interface_id"),
			"interface_name":    stmt.GetText("interface_name"),
			"interface_package": stmt.GetText("interface_package"),
			"concrete_id":       stmt.GetText("concrete_id"),
			"concrete_name":     stmt.GetText("concrete_name"),
			"concrete_package":  stmt.GetText("concrete_package"),
			"method_count":      stmt.ColumnInt(stmt.ColumnIndex("method_count")),
		})
	}
	s.writeJSON(w, http.StatusOK, rows)
}

func (s *Server) handleTypeMethods(w http.ResponseWriter, r *http.Request) {
	name := strings.TrimSpace(r.URL.Query().Get("name"))
	if name == "" {
		s.writeErr(w, http.StatusBadRequest, "missing name")
		return
	}
	limit, err := parseIntQuery(r.URL.Query(), "limit", 300, 1, 1000)
	if err != nil {
		s.writeErr(w, http.StatusBadRequest, "invalid limit")
		return
	}
	conn, err := s.conn()
	if err != nil {
		s.writeErr(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	defer s.pool.Put(conn)

	stmt, err := conn.Prepare(`SELECT type_id, type_name, method_id, method_name, signature, complexity, loc
FROM type_method_set
WHERE type_name = ?1
ORDER BY method_name
LIMIT ?2`)
	if err != nil {
		s.writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer stmt.Finalize()
	stmt.BindText(1, name)
	stmt.BindInt64(2, int64(limit))

	var rows []map[string]any
	for {
		ok, err := stmt.Step()
		if err != nil {
			s.writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		if !ok {
			break
		}
		rows = append(rows, map[string]any{
			"type_id":     stmt.GetText("type_id"),
			"type_name":   stmt.GetText("type_name"),
			"method_id":   stmt.GetText("method_id"),
			"method_name": stmt.GetText("method_name"),
			"signature":   stmt.GetText("signature"),
			"complexity":  stmt.ColumnInt(stmt.ColumnIndex("complexity")),
			"loc":         stmt.ColumnInt(stmt.ColumnIndex("loc")),
		})
	}
	s.writeJSON(w, http.StatusOK, rows)
}

func (s *Server) handleTypeHierarchy(w http.ResponseWriter, r *http.Request) {
	name := strings.TrimSpace(r.URL.Query().Get("name"))
	if name == "" {
		s.writeErr(w, http.StatusBadRequest, "missing name")
		return
	}
	limit, err := parseIntQuery(r.URL.Query(), "limit", 300, 1, 1000)
	if err != nil {
		s.writeErr(w, http.StatusBadRequest, "invalid limit")
		return
	}
	conn, err := s.conn()
	if err != nil {
		s.writeErr(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	defer s.pool.Put(conn)

	stmt, err := conn.Prepare(`SELECT type_id, type_name, type_package, embedded_id, embedded_name, embedded_package, depth
FROM type_hierarchy
WHERE type_name = ?1 OR embedded_name = ?1
ORDER BY depth, embedded_name
LIMIT ?2`)
	if err != nil {
		s.writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer stmt.Finalize()
	stmt.BindText(1, name)
	stmt.BindInt64(2, int64(limit))

	var rows []map[string]any
	for {
		ok, err := stmt.Step()
		if err != nil {
			s.writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		if !ok {
			break
		}
		rows = append(rows, map[string]any{
			"type_id":          stmt.GetText("type_id"),
			"type_name":        stmt.GetText("type_name"),
			"type_package":     stmt.GetText("type_package"),
			"embedded_id":      stmt.GetText("embedded_id"),
			"embedded_name":    stmt.GetText("embedded_name"),
			"embedded_package": stmt.GetText("embedded_package"),
			"depth":            stmt.ColumnInt(stmt.ColumnIndex("depth")),
		})
	}
	s.writeJSON(w, http.StatusOK, rows)
}

func (s *Server) handleXrefs(w http.ResponseWriter, r *http.Request) {
	defID := strings.TrimSpace(r.URL.Query().Get("def_id"))
	if defID == "" {
		s.writeErr(w, http.StatusBadRequest, "missing def_id")
		return
	}
	limit, err := parseIntQuery(r.URL.Query(), "limit", 400, 1, 1500)
	if err != nil {
		s.writeErr(w, http.StatusBadRequest, "invalid limit")
		return
	}

	conn, err := s.conn()
	if err != nil {
		s.writeErr(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	defer s.pool.Put(conn)

	stmt, err := conn.Prepare(`SELECT def_id, use_id, use_name, use_kind, use_package, use_file, use_line, edge_kind
FROM xrefs
WHERE def_id = ?1
ORDER BY use_file, use_line
LIMIT ?2`)
	if err != nil {
		s.writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer stmt.Finalize()
	stmt.BindText(1, defID)
	stmt.BindInt64(2, int64(limit))

	var rows []map[string]any
	for {
		ok, err := stmt.Step()
		if err != nil {
			s.writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		if !ok {
			break
		}
		rows = append(rows, map[string]any{
			"def_id":      stmt.GetText("def_id"),
			"use_id":      stmt.GetText("use_id"),
			"use_name":    stmt.GetText("use_name"),
			"use_kind":    stmt.GetText("use_kind"),
			"use_package": stmt.GetText("use_package"),
			"use_file":    stmt.GetText("use_file"),
			"use_line":    stmt.ColumnInt(stmt.ColumnIndex("use_line")),
			"edge_kind":   stmt.GetText("edge_kind"),
		})
	}
	s.writeJSON(w, http.StatusOK, rows)
}

func (s *Server) handleFileOutline(w http.ResponseWriter, r *http.Request) {
	file := strings.TrimSpace(r.URL.Query().Get("file"))
	if file == "" {
		s.writeErr(w, http.StatusBadRequest, "missing file")
		return
	}
	limit, err := parseIntQuery(r.URL.Query(), "limit", 1200, 1, 4000)
	if err != nil {
		s.writeErr(w, http.StatusBadRequest, "invalid limit")
		return
	}
	conn, err := s.conn()
	if err != nil {
		s.writeErr(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	defer s.pool.Put(conn)

	stmt, err := conn.Prepare(`SELECT id, parent_id, kind, name, line AS start_line, end_line, depth
FROM file_outline
WHERE file = ?1
ORDER BY line, depth
LIMIT ?2`)
	if err != nil {
		s.writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer stmt.Finalize()
	stmt.BindText(1, file)
	stmt.BindInt64(2, int64(limit))

	var rows []map[string]any
	for {
		ok, err := stmt.Step()
		if err != nil {
			s.writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		if !ok {
			break
		}
		rows = append(rows, map[string]any{
			"id":         stmt.GetText("id"),
			"parent_id":  stmt.GetText("parent_id"),
			"kind":       stmt.GetText("kind"),
			"name":       stmt.GetText("name"),
			"start_line": stmt.ColumnInt(stmt.ColumnIndex("start_line")),
			"end_line":   stmt.ColumnInt(stmt.ColumnIndex("end_line")),
			"depth":      stmt.ColumnInt(stmt.ColumnIndex("depth")),
		})
	}
	s.writeJSON(w, http.StatusOK, rows)
}

func (s *Server) handleFunctionDetail(w http.ResponseWriter, r *http.Request, id string) {
	if id == "" {
		s.writeErr(w, http.StatusBadRequest, "missing function id")
		return
	}

	conn, err := s.conn()
	if err != nil {
		s.writeErr(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	defer s.pool.Put(conn)

	stmt, err := conn.Prepare("SELECT function_id, name, package, file, line, end_line, signature, complexity, loc, fan_in, fan_out, num_params, num_locals, num_calls, num_branches, num_returns, finding_count, callers, callees FROM dashboard_function_detail WHERE function_id = ?")
	if err != nil {
		s.writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer stmt.Finalize()
	stmt.BindText(1, id)
	if ok, err := stmt.Step(); err != nil {
		s.writeErr(w, http.StatusInternalServerError, err.Error())
		return
	} else if !ok {
		s.writeErr(w, http.StatusNotFound, "function not found")
		return
	}

	detail := map[string]any{
		"function_id":   stmt.GetText("function_id"),
		"name":          stmt.GetText("name"),
		"package":       stmt.GetText("package"),
		"file":          stmt.GetText("file"),
		"line":          stmt.ColumnInt(stmt.ColumnIndex("line")),
		"end_line":      stmt.ColumnInt(stmt.ColumnIndex("end_line")),
		"signature":     stmt.GetText("signature"),
		"complexity":    stmt.ColumnInt(stmt.ColumnIndex("complexity")),
		"loc":           stmt.ColumnInt(stmt.ColumnIndex("loc")),
		"fan_in":        stmt.ColumnInt(stmt.ColumnIndex("fan_in")),
		"fan_out":       stmt.ColumnInt(stmt.ColumnIndex("fan_out")),
		"num_params":    stmt.ColumnInt(stmt.ColumnIndex("num_params")),
		"num_locals":    stmt.ColumnInt(stmt.ColumnIndex("num_locals")),
		"num_calls":     stmt.ColumnInt(stmt.ColumnIndex("num_calls")),
		"num_branches":  stmt.ColumnInt(stmt.ColumnIndex("num_branches")),
		"num_returns":   stmt.ColumnInt(stmt.ColumnIndex("num_returns")),
		"finding_count": stmt.ColumnInt(stmt.ColumnIndex("finding_count")),
		"callers":       stmt.GetText("callers"),
		"callees":       stmt.GetText("callees"),
	}
	s.writeJSON(w, http.StatusOK, detail)
}

// handleQueryByName runs a named query from the queries table with query params.
func (s *Server) handleQueryByName(w http.ResponseWriter, r *http.Request, name string) {
	if name == "" {
		s.writeErr(w, http.StatusBadRequest, "missing query name")
		return
	}
	limit, err := parseIntQuery(r.URL.Query(), "limit", 1000, 1, 5000)
	if err != nil {
		s.writeErr(w, http.StatusBadRequest, "invalid limit")
		return
	}

	conn, err := s.conn()
	if err != nil {
		s.writeErr(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	defer s.pool.Put(conn)

	var sql string
	stmt, err := conn.Prepare("SELECT sql FROM queries WHERE name = ?")
	if err != nil {
		s.writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	stmt.BindText(1, name)
	if ok, _ := stmt.Step(); !ok {
		stmt.Finalize()
		s.writeErr(w, http.StatusNotFound, "query not found")
		return
	}
	sql = stmt.GetText("sql")
	stmt.Finalize()

	// Bind query params from URL (e.g. function_id=xxx)
	q := r.URL.Query()
	run, err := conn.Prepare(sql)
	if err != nil {
		s.writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer run.Finalize()

	// Bind by parameter name (e.g. :function_id, @function_id, $function_id).
	for i := 1; i <= run.BindParamCount(); i++ {
		param := run.BindParamName(i)
		if len(param) < 2 {
			continue
		}
		key := param[1:]
		if v := q.Get(key); v != "" {
			run.BindText(i, v)
		}
	}

	var rows []map[string]any
	for {
		ok, err := run.Step()
		if err != nil {
			s.writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		if !ok {
			break
		}
		row := make(map[string]any)
		for i := 0; i < run.ColumnCount(); i++ {
			colName := run.ColumnName(i)
			switch run.ColumnType(i) {
			case sqlite.TypeInteger:
				row[colName] = run.ColumnInt64(i)
			case sqlite.TypeFloat:
				row[colName] = run.ColumnFloat(i)
			default:
				row[colName] = run.GetText(colName)
			}
		}
		rows = append(rows, row)
		if len(rows) >= limit {
			break
		}
	}
	s.writeJSON(w, http.StatusOK, map[string]any{
		"query":     name,
		"limit":     limit,
		"truncated": len(rows) >= limit,
		"rows":      rows,
	})
}
