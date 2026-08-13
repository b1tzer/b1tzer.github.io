#!/usr/bin/env python3
"""Fix MkDocs-style internal links to VitePress format"""
import os
import re
import glob

# Build doc_id to file path mapping
doc_map = {}
for md_file in glob.glob("docs/**/*.md", recursive=True):
    with open(md_file, 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith("doc_id:"):
                doc_id = line.strip().split(":", 1)[1].strip()
                # Convert to relative path from docs/
                rel_path = md_file.replace("docs/", "", 1)
                doc_map[doc_id] = rel_path
                break

print(f"Found {len(doc_map)} doc_id mappings")

# Fix links in all markdown files
link_pattern = re.compile(r'\[([^\]]+)\]\(@([^)]+)\)')
fixed_count = 0

for md_file in glob.glob("docs/**/*.md", recursive=True):
    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    def replace_link(match):
        text = match.group(1)
        doc_id = match.group(2)
        if doc_id in doc_map:
            target_file = doc_map[doc_id]
            # Calculate relative path
            current_dir = os.path.dirname(md_file.replace("docs/", "", 1))
            rel_path = os.path.relpath(target_file, current_dir)
            return f'[{text}]({rel_path})'
        else:
            print(f"WARNING: No mapping for doc_id: {doc_id}")
            return match.group(0)
    
    new_content = link_pattern.sub(replace_link, content)
    
    if new_content != content:
        with open(md_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        fixed_count += 1

print(f"Fixed links in {fixed_count} files")
