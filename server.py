#!/usr/bin/env python3
"""Server statis untuk pratinjau aplikasi Jimpitan Ronda (versi web / iPhone).

Dijalankan di 0.0.0.0:8080 supaya bisa dibuka lewat pratinjau sandbox.
Ciri khasnya:
  - tipe MIME benar untuk .webmanifest, .js, dan .json
  - header anti-simpan (no-store) supaya pratinjau selalu memakai berkas terbaru
  - tidak mengirim X-Frame-Options, jadi aman ditampilkan di dalam bingkai pratinjau
"""
import http.server
import os
import socketserver

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT", "8080"))


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript; charset=utf-8",
        ".mjs": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".webmanifest": "application/manifest+json; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # selalu ambil berkas terbaru saat pengembangan
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Service-Worker-Allowed", "/")
        super().end_headers()

    def log_message(self, fmt, *args):
        print("%s %s" % (self.address_string(), fmt % args), flush=True)


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    with Server(("0.0.0.0", PORT), Handler) as httpd:
        print("Jimpitan Ronda disajikan dari %s" % ROOT, flush=True)
        print("Mendengarkan di http://0.0.0.0:%d" % PORT, flush=True)
        httpd.serve_forever()
