Mentorium Pairing Algorithm
===========================

A minimal, mobile-friendly tool to generate balanced mentor assignments from student data using a bidirectional, score-based round-robin algorithm.

Features
--------
- Demo mode with realistic sample data (editable CWA, gender-balanced names)
- Upload mode with drag & drop (.xlsx/.xls), validation, and preview
- Template download prefilled with 36 demo rows
- Configurable number of mentors (auto-capped by rows)
- Per-mentor statistics (count, average, highest, lowest CWA)
- Clean two-step flow (Setup → Preview/Results), responsive UI

Quick start
-----------
```bash
npm install
npm run dev
# open http://localhost:3000
```

Build
-----
```bash
npm run build
npm run start
```

How it works
------------
- Students are sorted by CWA descending.
- Allocation passes alternate forward and backward across mentors to balance strengths.
- Stats are computed per mentor for a quick quality view.

Excel upload
------------
Required columns (case sensitive): `STUDENTID`, `INDEXNO`, `NAME`, `CWA`.
- STUDENTID: 8 digits
- INDEXNO: 7 digits
- NAME: e.g., `MENSAH, Ama (Miss)`
- CWA: 0–100 (two decimals)

Tech stack
----------
- Next.js App Router, TypeScript, Tailwind CSS v4
- `xlsx` for Excel parsing and generation

Notes
-----
- CWA inputs clamp to 0–100 and accept at most two decimals.
- On mobile, tables scroll horizontally; pagination keeps controls on one line.

License
-------
MIT
