# Scrape vremena po sajtu

Poslednji run: 2026-04-16

| Sajt | Vreme | Proizvoda | Napomena |
|------|-------|-----------|----------|
| amcarco | 23s | — | |
| axisshop | 24s | — | |
| bosshop | 8s | — | |
| eplaneta | 133s | — | |
| gama-alati | 381s | 4065 | |
| kliklak | 34s | 1464 | |
| metalflex | 13s | 415 | |
| najpovoljnijialati | 292s | 3876 | |
| odigledolokomotive | 376s | 2630 | dosta duplikata (4943 pre deduplikacije) |
| omni-alati | 171s | 1761 | |
| prodavnicaalata | 566s | 3218 | prazne stranice ka kraju (272 str, ali 1831 stvarnih) |
| sbt-alati | 7s | 1840 | |
| shoppster | 39s | 3273 | |
| simns | 50s | 223 | |
| superalati | 174s | 7563 | najveći sajt |
| timkomerc | 456s | 1855 | |
| wobyhaus | 35s | 0 | BUG: `$el is not defined` — 0 proizvoda |

**Ukupno vreme:** ~47 min
**Napomena:** prodavnicaalata i najpovoljnijialati imaju mnogo praznih stranica — treba dodati early exit.
