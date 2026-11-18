import sys
import re

def check_jsx_tags(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Very naive tag extractor that ignores strings/comments
    # We will just strip out all strings and comments first
    
    # Remove block comments
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    # Remove line comments
    content = re.sub(r'//.*', '', content)
    # Remove strings
    content = re.sub(r"'[^']*?'", "''", content)
    content = re.sub(r'"[^"]*?"', '""', content)
    content = re.sub(r'`[^`]*?`', '``', content)

    # Now find all tags: <tag ...> or </tag>
    tags = re.findall(r'<(/)?([a-zA-Z0-9_]+)([^>]*?)(/)?>', content)
    
    stack = []
    for is_close, tag_name, attrs, is_self_close in tags:
        if is_self_close == '/':
            continue # Self-closing tag like <Icon ... /> or <input ... />
        
        if is_close == '/':
            if not stack:
                print(f"Unexpected closing tag: </{tag_name}>")
                return
            expected = stack.pop()
            if expected != tag_name:
                print(f"Mismatched tag: expected </{expected}> but got </{tag_name}>")
                return
        else:
            stack.append(tag_name)

    if stack:
        print(f"Unclosed tags remaining in stack: {stack}")
    else:
        print("All JSX tags seem balanced.")

check_jsx_tags(sys.argv[1])
