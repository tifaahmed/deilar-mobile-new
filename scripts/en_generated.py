"""
English puzzles for the Riddles & Puzzles section (fawazeer). The Arabic section is mostly Arabic wordplay (plurals, proverbs,
grammar) that cannot be translated, so the English side has its own puzzles of the same kinds: arithmetic and sequences,
irregular plurals, opposites, synonyms, proverbs, scrambled words. Everything here is deterministic (same ids and same
option order on every build), so a player's progress is never disturbed.
"""
import random

def _rng(i):
    return random.Random(i * 7919 + 13)

def _put(correct, wrongs, i):
    """4 unique options with the right one at a position that depends on i."""
    seen = []
    for w in wrongs:
        if w != correct and w not in seen:
            seen.append(w)
    seen = seen[:3]
    assert len(seen) == 3, (correct, wrongs)
    pos = _rng(i).randrange(4)
    opts = seen[:pos] + [correct] + seen[pos:]
    return opts, pos

def _num_wrongs(ans, r):
    cand = {ans + d for d in (1, -1, 2, -2, 10, -10, 5, -5, 3, -3, 4, -4)} | {ans * 2, max(1, ans // 2)}
    cand.discard(ans)
    cand = sorted(x for x in cand if x > 0)
    r.shuffle(cand)
    return [str(x) for x in cand[:3]]

def maths():
    out = []   # (question, options, idx, explanation, category, difficulty)
    n = 0
    def add(q, ans, expl, diff, cat='Maths puzzles', wrongs=None):
        nonlocal n
        n += 1
        r = _rng(n + 1000)
        w = wrongs if wrongs is not None else _num_wrongs(ans, r)
        opts, idx = _put(str(ans), w, n + 1000)
        out.append((q, opts, idx, expl, cat, max(1, min(10, diff))))
    for a in range(6, 15):
        for b in range(a, 16):
            if a * b >= 36:
                add(f"What is {a} × {b}?", a * b, f"{a} × {b} = {a*b}.", 2 + (a * b) // 30)
    for a in range(15, 20):
        for b in range(6, 13):
            add(f"What is {a} × {b}?", a * b, f"{a} × {b} = {a*b}.", 5 + b // 6)
    for k in range(11, 31):
        add(f"What is {k} squared?", k * k, f"{k} × {k} = {k*k}.", 3 + k // 6)
        add(f"What is the square root of {k*k}?", k, f"{k} × {k} = {k*k}.", 3 + k // 6)
    for start in range(2, 22, 3):
        for step in (3, 4, 6, 7):
            seq = [start + step * i for i in range(5)]
            add(f"What number comes next: {', '.join(map(str, seq))}, ...?", start + step * 5, f"Add {step} each time.", 3 + step // 3)
    for start in (1, 2, 3, 4, 5):
        for mult in (2, 3, 4):
            seq = [start * mult ** i for i in range(4)]
            add(f"What number comes next: {', '.join(map(str, seq))}, ...?", start * mult ** 4, f"Multiply by {mult} each time.", 4 + mult)
    for pct in (5, 10, 15, 20, 25, 30, 40, 50, 75):
        for base in (80, 120, 160, 240, 360, 480):
            ans = pct * base // 100
            if pct * base % 100 == 0:
                add(f"What is {pct}% of {base}?", ans, f"{pct}% of {base} is {ans}.", 3 + pct // 20)
    for d, name in ((2, 'a half'), (3, 'a third'), (4, 'a quarter'), (5, 'a fifth'), (10, 'a tenth')):
        for base in (36, 60, 84, 120, 240):
            if base % d == 0:
                add(f"What is {name} of {base}?", base // d, f"{base} ÷ {d} = {base // d}.", 2 + d // 3)
    for h in range(2, 13):
        add(f"How many minutes are there in {h} hours?", 60 * h, f"{h} × 60 = {60*h}.", 3)
    for m in range(2, 11):
        add(f"How many seconds are there in {m} minutes?", 60 * m, f"{m} × 60 = {60*m}.", 3)
    for w in range(2, 10):
        add(f"How many days are there in {w} weeks?", 7 * w, f"{w} × 7 = {7*w}.", 2)
    for l, w in ((9, 4), (12, 5), (15, 7), (20, 8), (14, 6), (18, 9), (11, 3), (16, 10)):
        add(f"A rectangle is {l} cm long and {w} cm wide. What is its area?", l * w, f"{l} × {w} = {l*w} cm².", 4)
        add(f"A rectangle is {l} cm long and {w} cm wide. What is its perimeter?", 2 * (l + w), f"2 × ({l} + {w}) = {2*(l+w)} cm.", 4)
    for s in (5, 9, 11, 13, 15):
        add(f"A square has sides of {s} cm. What is its area?", s * s, f"{s} × {s} = {s*s} cm².", 4)
        add(f"A square has sides of {s} cm. What is its perimeter?", 4 * s, f"4 × {s} = {4*s} cm.", 3)
    names = ['Ali', 'Mona', 'Omar', 'Sara', 'Karim', 'Huda', 'Youssef', 'Nour']
    things = ['apples', 'stickers', 'marbles', 'books', 'coins', 'pencils', 'oranges', 'cards']
    for i in range(24):
        a = 20 + (i * 7) % 60
        b = 3 + (i * 5) % 15
        nm, th = names[i % 8], things[(i * 3) % 8]
        add(f"{nm} has {a} {th} and gives away {b}. How many are left?", a - b, f"{a} − {b} = {a-b}.", 2)
        add(f"{nm} buys {b} packs with {3 + i % 7} {th} in each. How many {th} is that?", b * (3 + i % 7), f"{b} × {3 + i % 7} = {b*(3 + i % 7)}.", 4)
    return out

PLURALS = [('man', 'men'), ('woman', 'women'), ('child', 'children'), ('foot', 'feet'), ('tooth', 'teeth'), ('mouse', 'mice'), ('goose', 'geese'), ('person', 'people'), ('leaf', 'leaves'), ('knife', 'knives'), ('wife', 'wives'), ('life', 'lives'), ('wolf', 'wolves'), ('shelf', 'shelves'), ('half', 'halves'), ('loaf', 'loaves'), ('thief', 'thieves'), ('calf', 'calves'), ('sheep', 'sheep'), ('fish', 'fish'), ('deer', 'deer'), ('ox', 'oxen'), ('cactus', 'cacti'), ('fungus', 'fungi'), ('nucleus', 'nuclei'), ('analysis', 'analyses'), ('crisis', 'crises'), ('phenomenon', 'phenomena'), ('criterion', 'criteria'), ('bacterium', 'bacteria'), ('medium', 'media'), ('datum', 'data'), ('louse', 'lice'), ('hero', 'heroes'), ('potato', 'potatoes'), ('tomato', 'tomatoes'), ('city', 'cities'), ('baby', 'babies'), ('box', 'boxes'), ('dish', 'dishes'), ('bus', 'buses'), ('church', 'churches'), ('echo', 'echoes'), ('piano', 'pianos'), ('photo', 'photos'), ('roof', 'roofs'), ('belief', 'beliefs'), ('day', 'days'), ('toy', 'toys'), ('key', 'keys')]

def plurals():
    out = []
    for i, (s, p) in enumerate(PLURALS):
        wrongs = [s + 's', s + 'es', s + 'ies', s[:-1] + 'ves', s + 'en', s + 'i', 'the ' + s]
        wrongs = [w for w in wrongs if w != p and w != s or (w == s and p == s)]
        wrongs = [w for w in dict.fromkeys(wrongs) if w != p][:3]
        if len(wrongs) < 3:
            wrongs += ['more ' + s, s + 'ies', s + 'z']
        opts, idx = _put(p, wrongs, 2000 + i)
        out.append((f"What is the plural of \"{s}\"?", opts, idx, f"The plural of {s} is {p}.", 'Word puzzles', 3 + (i % 6)))
    return out

ANTONYMS = [('hot', 'cold'), ('big', 'small'), ('fast', 'slow'), ('happy', 'sad'), ('light', 'dark'), ('up', 'down'), ('old', 'young'), ('hard', 'soft'), ('rich', 'poor'), ('full', 'empty'), ('open', 'closed'), ('early', 'late'), ('strong', 'weak'), ('clean', 'dirty'), ('wet', 'dry'), ('tall', 'short'), ('thick', 'thin'), ('heavy', 'light'), ('brave', 'cowardly'), ('generous', 'selfish'), ('ancient', 'modern'), ('victory', 'defeat'), ('expand', 'shrink'), ('accept', 'refuse'), ('arrive', 'depart'), ('create', 'destroy'), ('increase', 'decrease'), ('include', 'exclude'), ('guilty', 'innocent'), ('optimist', 'pessimist'), ('vacant', 'occupied'), ('transparent', 'opaque'), ('permanent', 'temporary'), ('humble', 'arrogant'), ('scarce', 'abundant'), ('fragile', 'sturdy'), ('shallow', 'deep'), ('rough', 'smooth'), ('noisy', 'quiet'), ('begin', 'finish'), ('buy', 'sell'), ('love', 'hate'), ('friend', 'enemy'), ('true', 'false'), ('push', 'pull'), ('inside', 'outside'), ('north', 'south'), ('east', 'west'), ('day', 'night'), ('sunrise', 'sunset'), ('succeed', 'fail'), ('push', 'pull')]
ANTONYMS = list(dict.fromkeys(ANTONYMS))

def antonyms():
    out = []
    pool = [b for _, b in ANTONYMS]
    for i, (a, b) in enumerate(ANTONYMS):
        r = _rng(3000 + i)
        wrongs = [w for w in pool if w != b]
        r.shuffle(wrongs)
        opts, idx = _put(b, wrongs[:6], 3000 + i)
        out.append((f"What is the opposite of \"{a}\"?", opts, idx, f"The opposite of {a} is {b}.", 'Word puzzles', 2 + (i % 5)))
    return out

SYNONYMS = [('big', 'large'), ('small', 'tiny'), ('fast', 'quick'), ('begin', 'start'), ('end', 'finish'), ('smart', 'clever'), ('happy', 'joyful'), ('angry', 'furious'), ('tired', 'exhausted'), ('hungry', 'starving'), ('beautiful', 'pretty'), ('difficult', 'hard'), ('easy', 'simple'), ('buy', 'purchase'), ('shout', 'yell'), ('look', 'gaze'), ('walk', 'stroll'), ('talk', 'speak'), ('help', 'assist'), ('choose', 'select'), ('brave', 'courageous'), ('silent', 'quiet'), ('rich', 'wealthy'), ('strange', 'odd'), ('frightened', 'scared'), ('enormous', 'huge'), ('ancient', 'old'), ('smile', 'grin'), ('gift', 'present'), ('home', 'house'), ('rapid', 'swift'), ('error', 'mistake'), ('rest', 'relax'), ('close', 'near'), ('trip', 'journey'), ('shine', 'glow'), ('clever', 'intelligent'), ('quick', 'rapid'), ('chilly', 'cold'), ('unhappy', 'miserable')]

def synonyms():
    out = []
    pool = [b for _, b in SYNONYMS]
    for i, (a, b) in enumerate(SYNONYMS):
        r = _rng(4000 + i)
        wrongs = [w for w in pool if w != b]
        r.shuffle(wrongs)
        opts, idx = _put(b, wrongs[:6], 4000 + i)
        out.append((f"Which word means the same as \"{a}\"?", opts, idx, f"{a.capitalize()} and {b} mean the same.", 'Word puzzles', 2 + (i % 5)))
    return out

PROVERBS = [("A stitch in time", "saves nine"), ("Actions speak", "louder than words"), ("All that glitters", "is not gold"), ("An apple a day", "keeps the doctor away"), ("A bird in the hand", "is worth two in the bush"), ("Better late", "than never"), ("Don't count your chickens", "before they hatch"), ("Don't judge a book", "by its cover"), ("Every cloud", "has a silver lining"), ("Practice makes", "perfect"), ("The early bird", "catches the worm"), ("Too many cooks", "spoil the broth"), ("When in Rome", "do as the Romans do"), ("Look before", "you leap"), ("Birds of a feather", "flock together"), ("A friend in need", "is a friend indeed"), ("Two wrongs", "don't make a right"), ("The pen is mightier", "than the sword"), ("Rome wasn't built", "in a day"), ("Laughter is", "the best medicine"), ("Out of sight", "out of mind"), ("Curiosity killed", "the cat"), ("Don't put all your eggs", "in one basket"), ("Fortune favours", "the bold"), ("Haste makes", "waste"), ("Honesty is", "the best policy"), ("It takes two", "to tango"), ("No pain", "no gain"), ("Slow and steady", "wins the race"), ("There's no place", "like home"), ("Time and tide", "wait for no man"), ("United we stand", "divided we fall"), ("Where there's a will", "there's a way"), ("You can't have your cake", "and eat it too"), ("Great minds", "think alike"), ("Beggars can't", "be choosers"), ("The grass is always greener", "on the other side"), ("Many hands", "make light work"), ("Patience is", "a virtue"), ("Knowledge is", "power")]

def proverbs():
    out = []
    ends = [e for _, e in PROVERBS]
    for i, (a, b) in enumerate(PROVERBS):
        r = _rng(5000 + i)
        wrongs = [w for w in ends if w != b]
        r.shuffle(wrongs)
        opts, idx = _put(b, wrongs[:6], 5000 + i)
        out.append((f"Complete the proverb: \"{a} ...\"", opts, idx, f"\"{a} {b}.\"", 'Proverbs & sayings', 3 + (i % 4)))
    return out

WORDS = ['planet', 'garden', 'window', 'pencil', 'monkey', 'orange', 'bridge', 'castle', 'island', 'jungle', 'market', 'silver', 'rocket', 'purple', 'basket', 'winter', 'camera', 'pirate', 'rabbit', 'bottle', 'candle', 'dragon', 'engine', 'forest', 'guitar', 'hammer', 'insect', 'jacket', 'kitten', 'ladder', 'mirror', 'napkin', 'parrot', 'ribbon', 'sponge', 'tomato', 'turtle', 'violin', 'walnut', 'zipper', 'anchor', 'butter', 'cheese', 'dinner', 'flower', 'grapes', 'honey', 'lemon', 'melon', 'pepper']

def scrambles():
    out = []
    for i, w in enumerate(WORDS):
        r = _rng(6000 + i)
        letters = list(w)
        for _ in range(20):
            r.shuffle(letters)
            if ''.join(letters) != w:
                break
        scr = ''.join(letters).upper()
        wrongs = [x for x in WORDS if x != w and len(x) == len(w)]
        r.shuffle(wrongs)
        wrongs = wrongs[:3] if len(wrongs) >= 3 else (wrongs + [x for x in WORDS if x != w and x not in wrongs])[:3]
        opts, idx = _put(w, wrongs, 6000 + i)
        out.append((f"Unscramble the letters: {scr}", opts, idx, f"The word is \"{w}\".", 'Word puzzles', 3 + (i % 4)))
    return out

def all_generated():
    items = maths() + plurals() + antonyms() + synonyms() + proverbs() + scrambles()
    seen, out = set(), []
    for it in items:
        if it[0] in seen:
            continue
        seen.add(it[0])
        out.append(it)
    return out
