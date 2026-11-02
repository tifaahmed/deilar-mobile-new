#!/usr/bin/env python3
"""Appends translated lines to src/data/en/batches/<section>.tsv. Reads stdin: one question per line, fields separated by ' | ':
   arabicId | question | option0 | option1 | option2 | option3 | explanation
Usage: python3 scripts/add_batch.py football < lines.txt"""
import os, sys
name = sys.argv[1]
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'data', 'en', 'batches', f'{name}.tsv')
have = set()
if os.path.exists(p):
    have = {l.split('\t')[0] for l in open(p, encoding='utf8') if l.strip() and not l.startswith('#')}
n = 0
with open(p, 'a', encoding='utf8') as out:
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        f = [x.strip() for x in line.split(' | ')]
        assert len(f) == 7, f'bad line ({len(f)} fields): {line[:80]}'
        if f[0] in have:
            continue
        out.write('\t'.join(f) + '\n'); n += 1
print(name, 'added', n)
