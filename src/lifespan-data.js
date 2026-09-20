// Sourced biography metadata, reviewed 2026-09-20. Event CSV dates stay separate.
// Unknown death years are never replaced with the last known appearance.
const ac = (page) => ({ title: 'Assassin’s Creed Wiki · character reference', url: `https://assassinscreed.fandom.com/wiki/${page}` });

export const LIFESPANS = {
  juno: {
    birthYear: null, birthLabel: '2195 IE', deathYear: 2018,
    firstKnownYear: -75000, lastKnownYear: 2018, kind: 'recorded',
    segments: [
      { start: -75000, end: -75000, kind: 'life' },
      { start: -75000, end: 2018, kind: 'continuation' },
      { start: 2018, end: 2018, kind: 'life' },
    ],
    note: 'Born in the Isu calendar, which cannot be reliably converted to BCE. Her original body died around 75,000 BCE; stored consciousness survived until her clone body was killed in 2018. The long dashed span represents that continuation, not one continuously living body.',
    sources: [ac('Juno'), ac('Isu')],
  },
  jupiter: {
    birthYear: null, deathYear: -75000, deathApprox: true,
    firstKnownYear: -75000, lastKnownYear: -75000,
    note: 'His birth year is unknown. Death is dated only approximately to the late Isu era. The later holographic message is a recording and does not extend his life into the modern era.',
    sources: [ac('Jupiter')],
  },
  minerva: {
    birthYear: null, deathYear: -75000, deathApprox: true,
    firstKnownYear: -75000, lastKnownYear: -75000,
    note: 'Her birth year is unknown. She survived the catastrophe, but her death is dated only approximately to the late Isu era. Later interactive projections are recordings, not evidence of a living body.',
    sources: [ac('Minerva')],
  },
  kassandra: {
    birthYear: -458, deathYear: 2018,
    firstKnownYear: -458, lastKnownYear: 2018,
    note: 'The Staff of Hermes sustained her physical life across more than two millennia. She died after passing it to Layla in 2018; her long solid bar is intentional.',
    sources: [ac('Kassandra'), { title: 'Ubisoft · Odyssey and Valhalla crossover', url: 'https://news.ubisoft.com/es-mx/article/2wfc7NcxEXzjOGiY6AGjnB/assassins-creed-valhalla-revela-la-expansin-el-amanecer-del-ragnark-y-el-crossover-entre-historias-gratis' }],
  },
  aya: {
    birthYear: -85, birthApprox: true, deathYear: null,
    firstKnownYear: -85, lastKnownYear: -30,
    note: 'Aya later took the name Amunet. Her death year is not recorded. The bar ends at a dated appearance in 30 BCE with an open cap, not a death marker.',
    sources: [ac('Amunet')],
  },
  bayek: {
    birthYear: -85, birthApprox: true, deathYear: null,
    firstKnownYear: -85, lastKnownYear: -38,
    note: 'His birth is approximate and his death year is unknown. The open bar shows the documented life through the Hidden Ones period in 38 BCE.',
    sources: [ac('Bayek')],
  },
  reda: {
    birthYear: null, deathYear: null,
    firstKnownYear: -48, lastKnownYear: 873, kind: 'recorded',
    sightings: [-48, -38, 873],
    note: 'Dated appearances place Reda in Egypt in 48 and 38 BCE and in England in 873 CE. Neither his birth, death, nor the explanation for his longevity is established. The dashed span connects known appearances, rather than claiming immortality.',
    sources: [ac('Reda')],
  },
  basim: {
    birthYear: 844, birthApprox: true, deathYear: null,
    firstKnownYear: 844, lastKnownYear: 2020,
    segments: [
      { start: 844, end: 877, kind: 'life' },
      { start: 877, end: 2020, kind: 'continuation' },
      { start: 2020, end: 2020, kind: 'life' },
    ],
    note: 'Around 844 is the biographical estimate; the supplied event CSV instead records 835. Imprisonment in Yggdrasil around 877 was not death. The dashed span shows suspension before his physical return in 2020. No death is recorded.',
    sources: [ac('Basim_ibn_Ishaq'), { title: 'Ubisoft · Assassin’s Creed Mirage', url: 'https://www.ubisoft.com/en-gb/game/assassins-creed/mirage' }],
  },
  eivor: {
    birthYear: 847, deathYear: null, deathLabel: 'After 889 CE',
    firstKnownYear: 847, lastKnownYear: 889,
    note: 'Her burial is known, but the year is not established. The event CSV’s approximate 920 entry is explicitly speculative. This view shows the documented lower bound after 889 and keeps the lifespan open.',
    sources: [ac('Eivor_Varinsdottir')],
  },
  hytham: {
    birthYear: 850, birthApprox: true, birthLabel: '850s CE', deathYear: null,
    firstKnownYear: 850, lastKnownYear: 889,
    note: 'The birth date is known only to the decade. The visual starts at the beginning of the 850s as an approximate bound. Activity is documented around 889; the open end is not a death date.',
    sources: [ac('Hytham')],
  },
  altair: {
    birthYear: 1165, deathYear: 1257,
    firstKnownYear: 1165, lastKnownYear: 1257,
    note: 'Both biographical endpoints are dated. These years agree with the birth and death entries in the supplied event CSV.',
    sources: [ac('Alta%C3%AFr_Ibn-La%27Ahad')],
  },
  almualim: {
    birthYear: null, deathYear: 1191,
    firstKnownYear: 1176, lastKnownYear: 1191, kind: 'recorded',
    note: 'His birth year is not established. The dashed span uses his recorded activity before his death in 1191; 1176 is an appearance, not a birth. The historical person who inspired him is not substituted for the game character.',
    sources: [ac('Al_Mualim'), ac('Assassination_%28Al_Mualim%29')],
  },
  ezio: {
    birthYear: 1459, deathYear: 1524,
    firstKnownYear: 1459, lastKnownYear: 1524,
    note: 'The dated physical life of Ezio Auditore. Both endpoints agree with the supplied event CSV.',
    sources: [ac('Ezio_Auditore_da_Firenze')],
  },
  yasuke: {
    birthYear: 1554, birthApprox: true, deathYear: null,
    firstKnownYear: 1579, lastKnownYear: 1582,
    note: 'The approximate birth year is derived from the Shadows database reporting an age of 26 or 27 at the March 1581 audience. It is not an exact biographical date. The open end uses the documented story window, not an inferred death.',
    sources: [ac('Database%3A_Yasuke_%28Shadows%29'), { title: 'Ubisoft Québec · Meet Naoe and Yasuke', url: 'https://quebec.ubisoft.com/en/assassins-creed-shadows-launches-november-15-features-dual-protagonists-in-feudal-japan/' }],
  },
  naoe: {
    birthYear: 1564, birthApprox: true, deathYear: null,
    firstKnownYear: 1564, lastKnownYear: 1582,
    note: 'The approximate birth year is also used in the event CSV. No death date is established. The bar stays open after the dated campaign window.',
    sources: [ac('Fujibayashi_Naoe'), { title: 'Character reference · approximate birth', url: 'https://assassinscreed.fandom.com/it/wiki/Fujibayashi_Naoe' }, { title: 'Ubisoft · Shadows character reference guide', url: 'https://staticctf.ubisoft.com/J3yJr34U2pZ2Ieem48Dwy9uqj5PNUQTn/6aruuVoFykY4wdG9V3vQKR/84fddc449756abd5cb3645a6741f3f79/acshadows-character-reference-final.pdf' }],
  },
  edward: {
    birthYear: 1693, deathYear: 1735,
    firstKnownYear: 1693, lastKnownYear: 1735,
    note: 'Both birth and death are dated. His life overlaps the first ten years of his son Haytham’s life.',
    sources: [ac('Edward_Kenway')],
  },
  haytham: {
    birthYear: 1725, deathYear: 1781,
    firstKnownYear: 1725, lastKnownYear: 1781,
    note: 'Both birth and death are dated. The shared scale makes the overlaps with Edward, Connor, and Arno visible.',
    sources: [ac('Haytham_Kenway')],
  },
  connor: {
    birthYear: 1756, deathYear: null,
    firstKnownYear: 1756, lastKnownYear: 1783,
    note: 'Connor’s birth is dated, but a death year is not established. The open bar reaches the documented Assassin’s Creed III period; it does not claim that he died in 1783.',
    sources: [ac('Ratonhnhak%C3%A9:ton'), { title: 'Ubisoft · Evolution of the Brotherhood', url: 'https://news.ubisoft.com/en-us/article/OdmNeoYjCSPewU2FGDBDZ/assassins-creed-mirage-the-evolution-of-the-brotherhood' }],
  },
  arno: {
    birthYear: 1768, deathYear: null,
    firstKnownYear: 1768, lastKnownYear: 1822,
    note: 'His death year is unknown. Activity is recorded around 1822, so the bar uses that appearance as an approximate open endpoint.',
    sources: [ac('Arno_Dorian')],
  },
  eviefrye: {
    birthYear: 1847, deathYear: null,
    firstKnownYear: 1847, lastKnownYear: 1914,
    note: 'Evie and Jacob were born on the same day. Their death dates are not established. The 1917 death entry in the supplied CSV is not used as a lifespan fact; the known record includes their relocation in 1914.',
    sources: [ac('Evie_Frye')],
  },
  jacobfrye: {
    birthYear: 1847, deathYear: null,
    firstKnownYear: 1847, lastKnownYear: 1914,
    note: 'Jacob and Evie were born on the same day. Their death dates are not established. The 1917 death entry in the supplied CSV is not used as a lifespan fact; the known record includes their relocation in 1914.',
    sources: [ac('Jacob_Frye')],
  },
  aiden: {
    birthYear: 1974, deathYear: null,
    firstKnownYear: 1974, lastKnownYear: 2013,
    note: 'No death is recorded. The open bar uses the dated Watch Dogs period. Ubisoft also confirms his later return in Bloodline, but that source does not establish an exact year, so no later endpoint is invented.',
    sources: [{ title: 'Watch Dogs Wiki · Aiden Pearce', url: 'https://watchdogs.fandom.com/wiki/Aiden_Pearce' }, { title: 'Ubisoft · Bloodline expansion', url: 'https://news.ubisoft.com/en-us/article/4pVWehK1u9eZWfVC4LD7DS/watch-dogs-legion-bloodline-expansion-out-now' }],
  },
  layla: {
    birthYear: 1984, deathYear: 2020,
    firstKnownYear: 1984, lastKnownYear: 2020,
    note: '2020 is her physical death. Her consciousness remains in the Grey with the Reader; that continuing state is not a second biological life or a newly dated death.',
    sources: [ac('Layla_Hassan')],
  },
  desmond: {
    birthYear: 1987, deathYear: 2012,
    firstKnownYear: 1987, lastKnownYear: 2020, plotEnd: 2020,
    segments: [
      { start: 1987, end: 2012, kind: 'life' },
      { start: 2012, end: 2020, kind: 'continuation' },
    ],
    note: '2012 is his physical death. The dashed extension marks the later Reader consciousness in the Grey, encountered in 2020. It does not extend his physical lifespan.',
    sources: [ac('Desmond_Miles'), ac('Database%3A_William_Miles')],
  },
};
