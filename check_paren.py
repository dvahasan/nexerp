import sys

def find_unmatched_paren(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    stack = []
    in_string = False
    string_char = None
    in_line_comment = False
    in_block_comment = False

    for i, char in enumerate(content):
        # Handle comments
        if in_line_comment:
            if char == '\n':
                in_line_comment = False
            continue
        if in_block_comment:
            if char == '*' and i + 1 < len(content) and content[i+1] == '/':
                in_block_comment = False
            continue

        if not in_string and not in_line_comment and not in_block_comment:
            if char == '/' and i + 1 < len(content) and content[i+1] == '/':
                in_line_comment = True
                continue
            if char == '/' and i + 1 < len(content) and content[i+1] == '*':
                in_block_comment = True
                continue

        # Handle strings
        if char in ["'", '"', '`'] and content[i-1] != '\\':
            if not in_string:
                in_string = True
                string_char = char
            elif string_char == char:
                in_string = False
                string_char = None

        if in_string:
            continue

        if char == '(':
            line_no = content.count('\n', 0, i) + 1
            col_no = i - content.rfind('\n', 0, i)
            stack.append((line_no, col_no))
        elif char == ')':
            if stack:
                stack.pop()
            else:
                line_no = content.count('\n', 0, i) + 1
                col_no = i - content.rfind('\n', 0, i)
                print(f"Unmatched ')' found at line {line_no}, col {col_no}")
                return

    if stack:
        print("Unmatched '(' found at the following locations:")
        for loc in stack:
            print(f"Line {loc[0]}, Col {loc[1]}")
    else:
        print("All '(' and ')' are balanced.")

find_unmatched_paren(sys.argv[1])
