import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

CSS_BLOCK_RE = re.compile(r'/\*[\s\S]*?\*/')
HTML_COMMENT_RE = re.compile(r'<!--([\s\S]*?)-->', re.MULTILINE)

def strip_css(text: str) -> str:
    return CSS_BLOCK_RE.sub('', text)

def strip_html(text: str) -> str:
    
    return HTML_COMMENT_RE.sub('', text)

def strip_js(text: str) -> str:
    
    out = []
    i = 0
    n = len(text)
    in_s = in_d = in_bt = False
    in_block = in_line = False
    while i < n:
        ch = text[i]
        nxt = text[i+1] if i + 1 < n else ''

        if in_line:
            if ch == '\n':
                out.append(ch)
                in_line = False
            i += 1
            continue
        if in_block:
            if ch == '*' and nxt == '/':
                i += 2
                in_block = False
            else:
                i += 1
            continue

        if not (in_s or in_d or in_bt):
            if ch == '/' and nxt == '/':
                in_line = True
                i += 2
                continue
            if ch == '/' and nxt == '*':
                in_block = True
                i += 2
                continue
            if ch == '"':
                in_d = True
                out.append(ch)
                i += 1
                continue
            if ch == "'":
                in_s = True
                out.append(ch)
                i += 1
                continue
            if ch == '`':
                in_bt = True
                out.append(ch)
                i += 1
                continue
            out.append(ch)
            i += 1
            continue

        
        if ch == '\\':
            out.append(ch)
            if i + 1 < n:
                out.append(text[i+1])
                i += 2
            else:
                i += 1
            continue
        if in_d and ch == '"':
            in_d = False
            out.append(ch)
            i += 1
            continue
        if in_s and ch == "'":
            in_s = False
            out.append(ch)
            i += 1
            continue
        if in_bt and ch == '`':
            in_bt = False
            out.append(ch)
            i += 1
            continue
        out.append(ch)
        i += 1
    return ''.join(out)

def strip_py(text: str) -> str:
    
    out = []
    i = 0
    n = len(text)
    in_s = in_d = False
    in_ts = in_td = False  
    while i < n:
        ch = text[i]
        nxt2 = text[i:i+3]
        if not (in_s or in_d or in_ts or in_td):
            if nxt2 == "'''":
                in_ts = True
                out.append(nxt2)
                i += 3
                continue
            if nxt2 == '"""':
                in_td = True
                out.append(nxt2)
                i += 3
                continue
            if ch == '#':
                
                while i < n and text[i] != '\n':
                    i += 1
                continue
            if ch == '"':
                in_d = True
                out.append(ch)
                i += 1
                continue
            if ch == "'":
                in_s = True
                out.append(ch)
                i += 1
                continue
            out.append(ch)
            i += 1
            continue
        
        if ch == '\\':
            out.append(ch)
            if i + 1 < n:
                out.append(text[i+1])
                i += 2
            else:
                i += 1
            continue
        if in_ts and nxt2 == "'''":
            in_ts = False
            out.append(nxt2)
            i += 3
            continue
        if in_td and nxt2 == '"""':
            in_td = False
            out.append(nxt2)
            i += 3
            continue
        if in_s and ch == "'":
            in_s = False
            out.append(ch)
            i += 1
            continue
        if in_d and ch == '"':
            in_d = False
            out.append(ch)
            i += 1
            continue
        out.append(ch)
        i += 1
    return ''.join(out)

def process_file(path: str):
    ext = os.path.splitext(path)[1].lower()
    try:
        with open(path, 'r', encoding='utf-8') as f:
            text = f.read()
    except Exception:
        return  
    orig = text
    if ext in ('.css',):
        text = strip_css(text)
    elif ext in ('.js',):
        text = strip_js(text)
    elif ext in ('.html',):
        text = strip_html(text)
    elif ext in ('.py',):
        text = strip_py(text)
    else:
        return
    if text != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(text)

def walk_and_process(root: str):
    for dirpath, dirnames, filenames in os.walk(root):
        
        if any(part.startswith('.git') for part in dirpath.split(os.sep)):
            continue
        for name in filenames:
            process_file(os.path.join(dirpath, name))

if __name__ == '__main__':
    walk_and_process(ROOT)