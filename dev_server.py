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
    
    server.watch(os.path.join(ROOT, 'css', '*.css'))
    server.watch(os.path.join(ROOT, 'script.js'))

    
    host = os.environ.get('HOST', '127.0.0.1')
    try:
        port = int(os.environ.get('PORT', '8010'))
    except ValueError:
        port = 8010
    try:
        liveport = int(os.environ.get('LIVEPORT', '35729'))
    except ValueError:
        liveport = 35729

    server.serve(root=ROOT, host=host, port=port, liveport=liveport, open_url_delay=None)

if __name__ == '__main__':
    main()
