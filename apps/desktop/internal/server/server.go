package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	"github.com/michaelnji/kairos/apps/desktop/internal/ingestion"
)

type LocalServer struct {
	config   Config
	listener net.Listener
	server   *http.Server
}

func NewLocalServer(config Config, ingestionService ingestion.Service) (*LocalServer, error) {
	if err := config.Validate(); err != nil {
		return nil, err
	}

	handler := NewHandler(ingestionService, config)
	listener, err := net.Listen("tcp", config.Address())
	if err != nil {
		return nil, fmt.Errorf("listen on %s: %w", config.Address(), err)
	}

	httpServer := &http.Server{
		Handler: handler,
	}

	return &LocalServer{
		config:   config,
		listener: listener,
		server:   httpServer,
	}, nil
}

func (s *LocalServer) Start() {
	go func() {
		if err := s.server.Serve(s.listener); err != nil && err != http.ErrServerClosed {
			log.Printf("server: local extension server stopped unexpectedly: %v", err)
		}
	}()
}

func (s *LocalServer) Close(ctx context.Context) error {
	if s == nil || s.server == nil {
		return nil
	}
	return s.server.Shutdown(ctx)
}

func (s *LocalServer) Address() string {
	if s == nil || s.listener == nil {
		return ""
	}
	return s.listener.Addr().String()
}

type errorResponse struct {
	Error string `json:"error"`
}

func NewHandler(ingestionService ingestion.Service, config Config) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("/v1/extension/handshake", func(w http.ResponseWriter, r *http.Request) {
		if err := ValidateIngestionMethod(r.Method); err != nil {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: err.Error()})
			return
		}
		if err := ValidateJSONContentType(r.Header.Get("Content-Type")); err != nil {
			writeJSON(w, http.StatusUnsupportedMediaType, errorResponse{Error: err.Error()})
			return
		}

		var request contracts.ExtensionHandshakeRequest
		if err := decodeJSONBody(w, r, config.MaxRequestBodyBytes, &request); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: err.Error()})
			return
		}

		response, err := ingestionService.HandshakeExtension(r.Context(), request)
		if err != nil {
			writeServiceError(w, err)
			return
		}

		writeJSON(w, http.StatusOK, response)
	})
	mux.HandleFunc("/v1/ingestion/events", func(w http.ResponseWriter, r *http.Request) {
		if err := ValidateIngestionMethod(r.Method); err != nil {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: err.Error()})
			return
		}
		if err := ValidateJSONContentType(r.Header.Get("Content-Type")); err != nil {
			writeJSON(w, http.StatusUnsupportedMediaType, errorResponse{Error: err.Error()})
			return
		}

		var request contracts.IngestEventsRequest
		if err := decodeJSONBody(w, r, config.MaxRequestBodyBytes, &request); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: err.Error()})
			return
		}

		response, err := ingestionService.IngestEvents(r.Context(), request)
		if err != nil {
			writeServiceError(w, err)
			return
		}

		writeJSON(w, http.StatusOK, response)
	})

	return mux
}

func writeServiceError(w http.ResponseWriter, err error) {
	var validationErr *ingestion.ValidationError
	if errors.As(err, &validationErr) {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: validationErr.Error()})
		return
	}

	writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
}

func decodeJSONBody(w http.ResponseWriter, r *http.Request, limit int64, target any) error {
	defer r.Body.Close()
	reader := http.MaxBytesReader(w, r.Body, limit)
	decoder := json.NewDecoder(reader)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return fmt.Errorf("invalid json body")
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", jsonContentType)
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("server: encode json response failed: %v", err)
	}
}
