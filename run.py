#!/usr/bin/env python3
import http.server
import socketserver
import webbrowser
import threading
import sys
import time

PORT = 8000
HOST = "127.0.0.1"

class Handler(http.server.SimpleHTTPRequestHandler):
    # Disable logging requests to clean up CLI console
    def log_message(self, format, *args):
        pass

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex((HOST, port)) == 0

def start_server(port):
    handler = Handler
    # Enable CORS and disable caching to facilitate local debugging
    handler.extensions_map.update({
        '.env': 'text/plain',
    })
    
    with socketserver.TCPServer((HOST, port), handler) as httpd:
        print(f"\n[+] Local Server running at http://{HOST}:{port}")
        print(f"[+] Press Ctrl+C to stop the server.\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[-] Shutting down server...")
            sys.exit(0)

def main():
    global PORT
    print("[*] Starting AI Question Paper Generator server...")
    
    # Resolve port conflicts if 8000 is occupied
    while is_port_in_use(PORT):
        print(f"[!] Port {PORT} is currently in use. Trying port {PORT + 1}...")
        PORT += 1

    # Start server in a separate background thread
    server_thread = threading.Thread(target=start_server, args=(PORT,), daemon=True)
    server_thread.start()
    
    # Give the server thread a moment to spin up
    time.sleep(0.5)

    # Open index.html in the default web browser
    url = f"http://{HOST}:{PORT}/index.html"
    print(f"[*] Opening browser to {url}...")
    webbrowser.open(url)
    
    # Keep the main thread alive to monitor keyboard interrupts
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[-] Exiting...")
        sys.exit(0)

if __name__ == "__main__":
    main()
