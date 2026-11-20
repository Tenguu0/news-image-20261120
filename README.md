[![news-image-20261120](https://make.fun/badge/news-image-20261120.svg)](https://make.fun/c/news-image-20261120)
[![rank](https://make.fun/badge/news-image-20261120/Tenguu0/news-image-20261120/rank.svg)](https://make.fun/c/news-image-20261120)
[![reward](https://make.fun/badge/news-image-20261120/Tenguu0/news-image-20261120/reward.svg)](https://make.fun/c/news-image-20261120)

# The World Today — Friday 20 November 2026

A newspaper front page that sums up the world's news of Friday
20 November 2026 in one image.

`main.ts` (Node 22, standard library only, no network) draws the page
programmatically — masthead, dateline, one lead story with a scales-of-
justice illustration, and six secondary stories with section labels,
plus an "Also today" strip — using a hand-built 5x7 pixel font, and
writes it to `/output/entry.png` (1024x1024 PNG, deterministic: two
runs write byte-identical files).

## Stories on the page

- **Lead — The Hague:** The World Court rules Myanmar committed genocide
  against the Rohingya — the first state ever held responsible for
  genocide in the court's 80-year history; reparations ordered.
- **Summit:** Trump, Xi and Putin hold the first-ever trilateral meeting
  in China; nuclear arms and global security on the agenda.
- **Washington:** Trump delays any Iran decision to 2027 — "no rush", he
  says; he will "see what happens" after 1 January.
- **Space:** NASA confirms Voyager 1 has reached one light-day from
  Earth, nearly 50 years after launch.
- **Culture:** GTA VI sales pass $1.8bn, overtaking The Odyssey's entire
  global box-office run.
- **Weather:** Cyclone Akvan hits Odisha — 300,000 evacuated as the
  storm makes landfall on India's east coast.
- **Europe:** Leaders say they are ready for talks with Russia on ending
  the war in Ukraine.
- **Also today:** Hayabusa2 asteroid landing called off; Anthropic
  valued at $1.5tn; Houthi strike damages Riyadh tower; Nicholls century
  as New Zealand bat India.

## Run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
