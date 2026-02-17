package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"

	"cpg-gen/internal/server"
)

func main() {
	dbPath := flag.String("db", "cpg.db", "Path to CPG SQLite database")
	addr := flag.String("addr", ":8080", "HTTP listen address")
	staticDir := flag.String("static", "", "Directory to serve static frontend files (optional)")
	flag.Parse()

	if _, err := os.Stat(*dbPath); err != nil {
		if os.IsNotExist(err) {
			log.Fatalf("database not found: %s (run cpg-gen first or use docker compose)", *dbPath)
		}
		log.Fatalf("database: %v", err)
	}

	srv, err := server.New(*dbPath)
	if err != nil {
		log.Fatalf("server: %v", err)
	}
	defer srv.Close()

	mux := http.NewServeMux()
	mux.Handle("/api/", http.StripPrefix("/api", srv))

	if *staticDir != "" {
		fs := http.FileServer(http.Dir(*staticDir))
		mux.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/" || r.URL.Path == "" {
				http.ServeFile(w, r, *staticDir+"/index.html")
				return
			}
			// SPA fallback: if no static file, serve index.html
			f := *staticDir + r.URL.Path
			if _, err := os.Stat(f); os.IsNotExist(err) {
				http.ServeFile(w, r, *staticDir+"/index.html")
				return
			}
			fs.ServeHTTP(w, r)
		}))
	} else {
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprint(w, "CPG API is running. Set -static to serve the frontend or use a reverse proxy.")
		})
	}

	log.Printf("Listening on %s (db: %s)", *addr, *dbPath)
	if err := http.ListenAndServe(*addr, mux); err != nil {
		log.Fatal(err)
	}
}
