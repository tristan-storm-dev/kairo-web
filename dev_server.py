from livereload import Server
import os

ROOT = os.path.dirname(os.path.abspath(__file__))

def main():
    server = Server()
    server.watch(os.path.join(ROOT, 'pages', '*.html'))
    server.watch(os.path.join(ROOT, 'index.html'))
    server.watch(os.path.join(ROOT, 'assets', '*.*'))
    server.watch(os.path.join(ROOT, 'assets', 'covers', '*.*'))
    server.watch(os.path.join(ROOT, 'style.css'))
    server.watch(os.path.join(ROOT, 'script.js'))

    server.serve(root=ROOT, host='127.0.0.1', port=8002, liveport=35729, open_url_delay=None)

if __name__ == '__main__':
    main()
