# Hullo type study

Hullo is about hardware NASA left on the Moon, on Mars and in deep space, told with live mission numbers, for readers 10 to 14. The current pair (Gabarito and Spline Sans Mono) reads like a default. Four directions follow, each tied to the subject. Every face is free to self-host and was checked against its license.

Specimens are in `design/type-specimens/`. Each one uses real Hullo content: the hero light time, the light-day countdown, the distance, the nav buttons, a passport stamp, a page title, a body paragraph, a caption with a NASA image ID, and a numeral test (200 px digits, look-alike pairs, 12 px text and tabular figures in the text face).

## The four directions

| | Mission records | Engraved hardware | Archive | Instrument readout |
|---|---|---|---|---|
| Idea | Typed Apollo flight plans, and IBM, which built the Saturn V guidance computer and the System/360 machines in Mission Control | Wide square-shouldered capitals like 1960s instrument panel labels and nameplates | Printed and a little worn, like a report pulled from a box | The live numbers are the hero, so a monospace with character leads and the text face is built for legibility |
| Display | IBM Plex Sans Condensed 700 | Michroma | Redaction 35 Bold | Martian Mono (variable) |
| Text | IBM Plex Sans | Barlow | Redaction | Atkinson Hyperlegible Next (variable) |
| Numbers | Courier Prime 700 | Azeret Mono | Cutive Mono | Martian Mono, with Departure Mono shown as an alternative |
| Latin woff2, all faces | about 101 KB | about 95 KB | about 90 KB | about 71 KB |

## Licenses

| Face | License | Source |
|---|---|---|
| IBM Plex Sans, IBM Plex Sans Condensed | SIL OFL 1.1 | https://github.com/IBM/plex, https://fontsource.org/fonts/ibm-plex-sans |
| Courier Prime | SIL OFL 1.1 | https://fonts.google.com/specimen/Courier+Prime |
| Michroma | SIL OFL 1.1 | https://fonts.google.com/specimen/Michroma |
| Barlow | SIL OFL 1.1 | https://github.com/jpt/barlow |
| Azeret Mono | SIL OFL 1.1 | https://github.com/displaay/Azeret |
| Redaction, Redaction 35 | SIL OFL 1.1 | https://www.redaction.us, https://fontsource.org/fonts/redaction |
| Cutive Mono | SIL OFL 1.1 | https://fonts.google.com/specimen/Cutive+Mono |
| Martian Mono | SIL OFL 1.1 | https://github.com/evilmartians/mono |
| Atkinson Hyperlegible Next | SIL OFL 1.1 | https://fonts.google.com/specimen/Atkinson+Hyperlegible+Next |
| Departure Mono | SIL OFL 1.1 (the font; the website code is MIT) | https://github.com/rektdeckard/departure-mono |

Each Fontsource package lists `OFL-1.1` in its npm metadata (checked 2026-11-03). The Departure Mono README lists the font under SIL OFL. IBM Plex Mono stays out because Wobbl already uses it.

## Comparison

Mission records looks chosen on purpose. Plex Sans Condensed gives a firm technical title, and Plex Sans is easy to read at 16 px, with a tailed l, a serifed I and tabular figures that line up. Courier Prime at hero size reads as a typed document, which suits flight plans. At 12 px it is lighter than the other monos and its 0 is only a little narrower than O, so small numbers need care.

Engraved hardware has the strongest silhouette but fails the numeral test. Michroma's 0 and O are nearly the same rounded rectangle. Barlow's l and I are both plain bars. Azeret Mono is so wide that the 200 px digits do not fit a 1440 px screen. For a 12 year old reading "1" and "l", this direction is the hardest.

Archive has the most personality. The worn Redaction title is memorable. It fails for this audience, though. Redaction's text figure 1 looks like a small l ("Voyager l"), its figures are not tabular so number columns drift, and Cutive Mono is too thin to carry a 130 px hero.

Instrument readout fits Hullo best. Martian Mono's 0 carries a slash so it never reads as O, its 1, l and I are all distinct, and its digits hold up at 200 px and at 12 px. Atkinson Hyperlegible Next was made for the Braille Institute for readers with low vision, so it is the easiest face here for a 12 year old, and its figures line up. The weak spot is width. Martian Mono is wide, so on phones the hero must drop to the condensed width axis (the specimen does this below 600 px), and long stamp lines wrap. Departure Mono is charming but its pixel shapes look like a game at hero size, so it stays an alternative.

## Recommendation

Instrument readout, with Mission records as the second choice.

## Decision

On 3 Nov 2026 the owner chose to keep the current fonts, Gabarito and Spline Sans Mono, everywhere on the site. The specimens stay here as a record.
