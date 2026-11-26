# The World in One Page — Wednesday 25 November 2026

[![make.fun](https://make.fun/badge/news-image-20261125.svg)](https://make.fun/bounty/news-image-20261125)
[![rank](https://make.fun/badge/news-image-20261125/lerrboyy/news-image-20261125/rank.svg)](https://make.fun/bounty/news-image-20261125)
[![reward](https://make.fun/badge/news-image-20261125/lerrboyy/news-image-20261125/reward.svg)](https://make.fun/bounty/news-image-20261125)

A program that sums up the world's news of Wednesday 25 November 2026 in a single image:
one newspaper front page — masthead, a drawn hero scene of the Strait of Hormuz tanker
fire, a markets ticker, six region panels carrying 31 sourced stories, a "day in order"
strip, and a sources footer.

## The day it covers

- **Lead:** two oil tankers struck naval mines and caught fire in the Strait of Hormuz
  (as the IRGC claimed); Houthis hit Saudi Arabia's Ras Tanura refinery and a Riyadh tower.
- **Markets:** Kospi −6.2%, S&P 500 −2.2%, Nasdaq −3.2%; the US proposed 20–40% tariffs
  on 14 economies.
- **Space:** China's Shenzhou-24 docked at Tiangong carrying Pakistan's first astronaut.
- **Also inside:** the Huawei verdict, the Odesa strikes, the Bogor gold-mine flood
  (9 dead, 17 trapped), the Solomon Islands–Australia treaty, COP31's failure, and more —
  31 stories across 7 regions and fields, every fact as reported that day, claims
  labelled as claims.

## How it works

`main.ts` (Node 22, standard library only, no network) draws the whole page itself,
pixel by pixel: a hand-built 5×7 bitmap letter set scaled for headlines and body text,
flat-colour shapes for the sea, the tankers, the flames and the smoke, and its own PNG
encoder (zlib + a small checksum routine). Nothing is random and nothing depends on the
clock, so both grader runs write the identical bytes: a 1024×1024 PNG under 1 MiB at
`/output/entry.png`.

Run it locally:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Entry

- Competition: [Sum up 25 November's world news in one image](https://make.fun/bounty/news-image-20261125)
- Reward: $100 shared by the 50 best entries ($20 / $12 / $6 / $2 / $1.20)
- License: MIT
