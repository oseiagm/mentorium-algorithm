A Mentorium thingamajig.
===========================
The bidirectional, score-based round-robin pairing algorithm that powers Mentorium, the academic mentorship management platform.


Features
--------
- Demo mode with sample data and editable CWA
- Upload mode with drag & drop (.xlsx/.xls), validation, and preview
- Template download prefilled with data
- Configurable number of mentors
- Per-mentor statistics (count, average, highest, lowest CWA)

Quick start
-----------
```bash
npm install
npm run dev
# open http://localhost:3000
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
- NAME: e.g., `MENSAH, Ama (Miss)`, `NKRUMAH, Kwame`
- CWA: 0–100 (two decimals)
