/**
 * Kundali Engine - Pure JavaScript Vedic Astrology Calculator
 * No external APIs. Self-contained astronomy math.
 */
(function () {
  "use strict";

  // ── Constants ──────────────────────────────────────────────────────────────
  const DEG = Math.PI / 180;
  const RAD = 180 / Math.PI;

  const RASHI_NAMES = [
    "Mesh", "Vrishabh", "Mithun", "Kark", "Simha", "Kanya",
    "Tula", "Vrishchik", "Dhanu", "Makar", "Kumbh", "Meen"
  ];

  const PLANET_NAMES = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
  const PLANET_ABBR  = ["Su",  "Mo",  "Ma",  "Me",      "Ju",      "Ve",    "Sa",    "Ra",  "Ke"];

  // Nakshatra lords for Vimshottari Dasha (0-index matches nakshatra 1-27)
  const NAKSHATRA_DATA = [
    { name: "Ashwini",       lord: "Ketu",    years: 7  },
    { name: "Bharani",       lord: "Venus",   years: 20 },
    { name: "Krittika",      lord: "Sun",     years: 6  },
    { name: "Rohini",        lord: "Moon",    years: 10 },
    { name: "Mrigashira",    lord: "Mars",    years: 7  },
    { name: "Ardra",         lord: "Rahu",    years: 18 },
    { name: "Punarvasu",     lord: "Jupiter", years: 16 },
    { name: "Pushya",        lord: "Saturn",  years: 19 },
    { name: "Ashlesha",      lord: "Mercury", years: 17 },
    { name: "Magha",         lord: "Ketu",    years: 7  },
    { name: "Purva Phalguni",lord: "Venus",   years: 20 },
    { name: "Uttara Phalguni",lord:"Sun",     years: 6  },
    { name: "Hasta",         lord: "Moon",    years: 10 },
    { name: "Chitra",        lord: "Mars",    years: 7  },
    { name: "Swati",         lord: "Rahu",    years: 18 },
    { name: "Vishakha",      lord: "Jupiter", years: 16 },
    { name: "Anuradha",      lord: "Saturn",  years: 19 },
    { name: "Jyeshtha",      lord: "Mercury", years: 17 },
    { name: "Mula",          lord: "Ketu",    years: 7  },
    { name: "Purva Ashadha", lord: "Venus",   years: 20 },
    { name: "Uttara Ashadha",lord: "Sun",     years: 6  },
    { name: "Shravana",      lord: "Moon",    years: 10 },
    { name: "Dhanishtha",    lord: "Mars",    years: 7  },
    { name: "Shatabhisha",   lord: "Rahu",    years: 18 },
    { name: "Purva Bhadrapada",lord:"Jupiter",years: 16 },
    { name: "Uttara Bhadrapada",lord:"Saturn",years: 19 },
    { name: "Revati",        lord: "Mercury", years: 17 },
  ];

  const DASHA_ORDER = ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"];
  const DASHA_YEARS = { Ketu:7, Venus:20, Sun:6, Moon:10, Mars:7, Rahu:18, Jupiter:16, Saturn:19, Mercury:17 };
  const TOTAL_DASHA_YEARS = 120;

  // Exaltation / debilitation / own sign (tropical longitude, will correct by ayanamsa in use)
  const PLANET_STATUS = {
    Sun:     { exalt: 0,  exaltDeg: 10,  debil: 180, own: [120]       },
    Moon:    { exalt: 30, exaltDeg: 3,   debil: 210, own: [90]        },
    Mars:    { exalt: 270,exaltDeg: 28,  debil: 90,  own: [0,210]     },
    Mercury: { exalt: 150,exaltDeg: 15,  debil: 330, own: [60,150]    },
    Jupiter: { exalt: 90, exaltDeg: 5,   debil: 270, own: [240,330]   },
    Venus:   { exalt: 330,exaltDeg: 27,  debil: 150, own: [30,180]    },
    Saturn:  { exalt: 180,exaltDeg: 20,  debil: 0,   own: [270,300]   },
    Rahu:    { exalt: 60, exaltDeg: 0,   debil: 240, own: []          },
    Ketu:    { exalt: 240,exaltDeg: 0,   debil: 60,  own: []          },
  };

  // ── Julian Day Number ─────────────────────────────────────────────────────
  function toJD(year, month, day, hour, minute, second) {
    // Gregorian calendar
    if (month <= 2) { year--; month += 12; }
    const A = Math.floor(year / 100);
    const B = 2 - A + Math.floor(A / 4);
    const JD = Math.floor(365.25 * (year + 4716)) +
               Math.floor(30.6001 * (month + 1)) +
               day + B - 1524.5 +
               (hour + minute / 60 + second / 3600) / 24;
    return JD;
  }

  function jdFromBirthData(bd) {
    const [y, m, d]   = bd.date.split("-").map(Number);
    const [hr, mn]    = bd.time.split(":").map(Number);
    const utcHour     = hr - bd.timezone;
    return toJD(y, m, d, utcHour, mn, 0);
  }

  // ── Lahiri Ayanamsa ───────────────────────────────────────────────────────
  function lahiriAyanamsa(jd) {
    const T = (jd - 2451545.0) / 36525.0;
    // IAU 1976 precession + Lahiri correction
    const ayanamsa = 23.85 + 0.013645 * T + T * T / 200000;
    // More precise formula used by many astrology software
    const t = (jd - 2299160.0) / 36525.0;
    return 22.46047 + 1.396042 * t + 0.000308 * t * t;
  }

  // ── Sun position (Meeus low precision) ───────────────────────────────────
  function sunLongitude(jd) {
    const n = jd - 2451545.0;
    const L = (280.460 + 0.9856474 * n) % 360;
    const g = ((357.528 + 0.9856003 * n) % 360) * DEG;
    const lambda = L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g);
    return ((lambda % 360) + 360) % 360;
  }

  // ── Moon position ─────────────────────────────────────────────────────────
  function moonLongitude(jd) {
    const T = (jd - 2451545.0) / 36525.0;
    const L0 = 218.316 + 13.176396 * (jd - 2451545.0);
    const M  = (134.963 + 13.064993 * (jd - 2451545.0)) * DEG;
    const F  = (93.272  + 13.229350 * (jd - 2451545.0)) * DEG;
    const D  = (297.850 + 12.190749 * (jd - 2451545.0)) * DEG;
    const Msun = (357.528 + 0.9856003 * (jd - 2451545.0)) * DEG;
    const lon = L0
      + 6.289 * Math.sin(M)
      - 1.274 * Math.sin(2*D - M)
      + 0.658 * Math.sin(2*D)
      - 0.186 * Math.sin(Msun)
      - 0.059 * Math.sin(2*D - 2*M)
      - 0.057 * Math.sin(2*D - M + Msun)
      + 0.053 * Math.sin(2*D + M)
      + 0.046 * Math.sin(2*D - Msun)
      + 0.041 * Math.sin(M - Msun)
      - 0.035 * Math.sin(D)
      - 0.031 * Math.sin(M + Msun)
      - 0.015 * Math.sin(2*F - 2*D)
      + 0.011 * Math.sin(M - 4*D);
    return ((lon % 360) + 360) % 360;
  }

  // ── Planetary positions (simplified VSOP87-style) ─────────────────────────
  function marsLongitude(jd) {
    const T = (jd - 2451545.0) / 36525.0;
    const M = ((19.373 + 0.5240207766 * (jd - 2451545.0)) % 360) * DEG;
    const L = 355.433 + 19373.18 * T;
    return ((L + 10.691 * Math.sin(M) + 0.623 * Math.sin(2*M)) % 360 + 360) % 360;
  }

  function mercuryLongitude(jd) {
    const n = jd - 2451545.0;
    const L = (252.251 + 4.09233 * n) % 360;
    const M = ((174.795 + 4.09233 * n) % 360) * DEG;
    return ((L + 23.440 * Math.sin(M) + 2.998 * Math.sin(2*M)) % 360 + 360) % 360;
  }

  function jupiterLongitude(jd) {
    const n = jd - 2451545.0;
    const L = (34.351 + 0.08309 * n) % 360;
    const M = ((20.020 + 0.08309 * n) % 360) * DEG;
    return ((L + 5.555 * Math.sin(M) + 0.168 * Math.sin(2*M)) % 360 + 360) % 360;
  }

  function venusLongitude(jd) {
    const n = jd - 2451545.0;
    const L = (181.979 + 1.60213 * n) % 360;
    const M = ((212.448 + 1.60213 * n) % 360) * DEG;
    return ((L + 0.776 * Math.sin(M)) % 360 + 360) % 360;
  }

  function saturnLongitude(jd) {
    const n = jd - 2451545.0;
    const L = (50.077 + 0.03346 * n) % 360;
    const M = ((317.020 + 0.03346 * n) % 360) * DEG;
    return ((L + 6.406 * Math.sin(M) + 0.319 * Math.sin(2*M)) % 360 + 360) % 360;
  }

  // Rahu (mean node) - retrograde motion
  function rahuLongitude(jd) {
    const T = (jd - 2451545.0) / 36525.0;
    const omega = 125.0445 - 1934.1362 * T + 0.0020754 * T * T;
    return ((omega % 360) + 360) % 360;
  }

  // ── All 9 planets ─────────────────────────────────────────────────────────
  function getAllPlanets(jd) {
    const ayanamsa = lahiriAyanamsa(jd);
    const raw = [
      sunLongitude(jd),
      moonLongitude(jd),
      marsLongitude(jd),
      mercuryLongitude(jd),
      jupiterLongitude(jd),
      venusLongitude(jd),
      saturnLongitude(jd),
      rahuLongitude(jd),
      (rahuLongitude(jd) + 180) % 360,  // Ketu = Rahu + 180
    ];
    return raw.map((lon, i) => {
      const sid = ((lon - ayanamsa) % 360 + 360) % 360;
      const rashi = Math.floor(sid / 30);
      const degree = sid % 30;
      const nakIdx = Math.floor(sid / (360/27));
      const pada   = Math.floor((sid % (360/27)) / (360/27/4)) + 1;
      return {
        name:      PLANET_NAMES[i],
        abbr:      PLANET_ABBR[i],
        longitude: sid,
        rashi:     rashi,
        rashiName: RASHI_NAMES[rashi],
        degree:    degree,
        nakshatra: NAKSHATRA_DATA[nakIdx].name,
        nakshatraLord: NAKSHATRA_DATA[nakIdx].lord,
        pada:      pada,
        status:    getPlanetStatus(PLANET_NAMES[i], sid),
      };
    });
  }

  function getPlanetStatus(name, lon) {
    const data = PLANET_STATUS[name];
    if (!data) return "Neutral";
    const rashi = Math.floor(lon / 30);
    const exaltRashi = Math.floor(data.exalt / 30);
    const debilRashi = Math.floor(data.debil / 30);
    const ownRashis  = data.own.map(l => Math.floor(l / 30));
    if (rashi === exaltRashi) return "Exalted";
    if (rashi === debilRashi) return "Debilitated";
    if (ownRashis.includes(rashi)) return "Own Sign";
    return "Neutral";
  }

  // ── Lagna (Ascendant) ─────────────────────────────────────────────────────
  function calcLagna(jd, lat, lng) {
    // GMST at 0h UT
    const T  = (Math.floor(jd - 0.5) + 0.5 - 2451545.0) / 36525.0;
    const GMST0 = 100.4606184 + 36000.77004 * T + 0.000387933 * T * T;
    // Fraction of UT day
    const utFrac = (jd - Math.floor(jd - 0.5) - 0.5) * 24;
    const GMST   = (GMST0 + 360.98564724 * utFrac / 24) % 360;
    const LST    = ((GMST + lng) % 360 + 360) % 360;
    // RAMC = LST in degrees
    const RAMC   = LST;
    const eps    = 23.4397 * DEG; // obliquity
    const latRad = lat * DEG;
    // Ascendant from RAMC
    const y      = -Math.cos(RAMC * DEG);
    const x      = Math.sin(RAMC * DEG) * Math.cos(eps) + Math.tan(latRad) * Math.sin(eps);
    let   asc    = Math.atan2(y, x) * RAD;
    if (asc < 0) asc += 360;
    // Correct quadrant
    if (RAMC >= 0 && RAMC < 180) {
      if (asc < 180) asc += 180;
    } else {
      if (asc >= 180) asc -= 180;
    }
    const ayanamsa = lahiriAyanamsa(jd);
    const sidAsc   = ((asc - ayanamsa) % 360 + 360) % 360;
    return {
      longitude: sidAsc,
      rashi:     Math.floor(sidAsc / 30),
      rashiName: RASHI_NAMES[Math.floor(sidAsc / 30)],
      degree:    sidAsc % 30,
    };
  }

  // ── Houses (Whole Sign) ───────────────────────────────────────────────────
  function calcHouses(lagna) {
    const houses = [];
    for (let i = 0; i < 12; i++) {
      const h = (lagna.rashi + i) % 12;
      houses.push({ house: i + 1, rashi: h, rashiName: RASHI_NAMES[h] });
    }
    return houses;
  }

  function getHouseOfPlanet(planet, lagnaRashi) {
    return ((planet.rashi - lagnaRashi + 12) % 12) + 1;
  }

  // ── Vimshottari Dasha ─────────────────────────────────────────────────────
  function calcDasha(moonLon, jd) {
    const nakIdx      = Math.floor(moonLon / (360 / 27));
    const nak         = NAKSHATRA_DATA[nakIdx];
    const nakFraction = (moonLon % (360 / 27)) / (360 / 27);
    const startLord   = nak.lord;

    // Elapsed portion of this dasha at birth
    const elapsed   = nakFraction * nak.years; // years already elapsed in current dasha
    const remaining = nak.years - elapsed;

    // Build full 120 year cycle starting from birth
    const lordIdx   = DASHA_ORDER.indexOf(startLord);
    const dashas    = [];
    let cursor      = new Date(jdToDate(jd));

    // First partial dasha
    const firstEnd = addYears(cursor, remaining);
    dashas.push({
      lord:  startLord,
      years: nak.years,
      start: fmtDate(cursor),
      end:   fmtDate(firstEnd),
    });
    cursor = firstEnd;

    for (let i = 1; i < DASHA_ORDER.length; i++) {
      const idx  = (lordIdx + i) % DASHA_ORDER.length;
      const lord = DASHA_ORDER[idx];
      const yrs  = DASHA_YEARS[lord];
      const end  = addYears(cursor, yrs);
      dashas.push({ lord, years: yrs, start: fmtDate(cursor), end: fmtDate(end) });
      cursor = end;
    }

    // Current dasha
    const today    = new Date();
    const current  = dashas.find(d => new Date(d.start) <= today && new Date(d.end) > today) || dashas[0];

    return { dashas, current, nakshatra: nak.name, nakshatraLord: nak.lord };
  }

  function calcAntardashas(mahadasha) {
    const lordIdx  = DASHA_ORDER.indexOf(mahadasha.lord);
    const total    = DASHA_YEARS[mahadasha.lord];
    const start    = new Date(mahadasha.start);
    const antars   = [];
    let cursor     = new Date(start);

    for (let i = 0; i < DASHA_ORDER.length; i++) {
      const idx   = (lordIdx + i) % DASHA_ORDER.length;
      const aLord = DASHA_ORDER[idx];
      const days  = (DASHA_YEARS[aLord] / TOTAL_DASHA_YEARS) * total * 365.25;
      const end   = new Date(cursor.getTime() + days * 86400000);
      antars.push({ lord: aLord, start: fmtDate(cursor), end: fmtDate(end) });
      cursor = end;
    }
    return antars;
  }

  // ── Yogas ─────────────────────────────────────────────────────────────────
  function detectYogas(planets, lagna) {
    const yogas = [];
    const byName = {};
    planets.forEach(p => { byName[p.name] = p; });

    // Gaja Kesari: Jupiter in kendra (1,4,7,10) from Moon
    const moonRashi = byName.Moon.rashi;
    const jupHouse  = ((byName.Jupiter.rashi - moonRashi + 12) % 12) + 1;
    yogas.push({
      name: "Gaja Kesari",
      present: [1,4,7,10].includes(jupHouse),
      description: "Jupiter in kendra from Moon — wisdom, fame, prosperity",
    });

    // Budhaditya: Sun + Mercury in same rashi
    yogas.push({
      name: "Budhaditya",
      present: byName.Sun.rashi === byName.Mercury.rashi,
      description: "Sun & Mercury conjunct — sharp intellect, eloquence",
    });

    // Hamsa Yoga: Jupiter in own/exalted in kendra from lagna
    const jupFromLagna = getHouseOfPlanet(byName.Jupiter, lagna.rashi);
    const jupStatus    = byName.Jupiter.status;
    yogas.push({
      name: "Hamsa",
      present: [1,4,7,10].includes(jupFromLagna) && ["Exalted","Own Sign"].includes(jupStatus),
      description: "Jupiter strong in kendra — divine grace, righteous fame",
    });

    // Vipreet Raj Yoga: 6/8/12 lord in 6/8/12
    const dusthanas    = [5, 7, 11]; // 0-based house indices (6,8,12)
    const dusthanaRashis = dusthanas.map(i => (lagna.rashi + i) % 12);
    const dusthanaPlanets = planets.filter(p => dusthanaRashis.includes(p.rashi));
    yogas.push({
      name: "Vipreet Raj",
      present: dusthanaPlanets.length >= 2,
      description: "Lords of 6/8/12 in dusthanas — rise after adversity",
    });

    // Dhana Yoga: 2nd + 11th lord conjunction or exchange
    const h2Rashi  = (lagna.rashi + 1) % 12;
    const h11Rashi = (lagna.rashi + 10) % 12;
    const h2Planet  = planets.find(p => p.rashi === h2Rashi);
    const h11Planet = planets.find(p => p.rashi === h11Rashi);
    const dhana = h2Planet && h11Planet && h2Planet.rashi === h11Planet.rashi;
    yogas.push({
      name: "Dhana Yoga",
      present: dhana,
      description: "2nd & 11th lords together — wealth accumulation",
    });

    // Kendra-Trikona Raja Yoga: kendra lord + trikona lord conjunction
    const kendraRashis  = [0,3,6,9].map(i => (lagna.rashi + i) % 12);
    const trikonaRashis = [0,4,8].map(i => (lagna.rashi + i) % 12);
    let rajaYoga = false;
    planets.forEach(p1 => {
      planets.forEach(p2 => {
        if (p1.name !== p2.name && p1.rashi === p2.rashi) {
          if (kendraRashis.includes(p1.rashi) || trikonaRashis.includes(p2.rashi)) {
            rajaYoga = true;
          }
        }
      });
    });
    yogas.push({
      name: "Kendra-Trikona Raja Yoga",
      present: rajaYoga,
      description: "Kendra & trikona lords conjunct — power, authority",
    });

    return yogas;
  }

  // ── Doshas ────────────────────────────────────────────────────────────────
  function detectDoshas(planets, lagna, dashaInfo) {
    const doshas = [];
    const byName = {};
    planets.forEach(p => { byName[p.name] = p; });

    // Mangal Dosha: Mars in 1,2,4,7,8,12 from lagna or Moon or Venus
    const marsHouseFromLagna  = getHouseOfPlanet(byName.Mars, lagna.rashi);
    const marsHouseFromMoon   = ((byName.Mars.rashi - byName.Moon.rashi + 12) % 12) + 1;
    const marsHouseFromVenus  = ((byName.Mars.rashi - byName.Venus.rashi + 12) % 12) + 1;
    const mangalHouses        = [1,2,4,7,8,12];
    const mangalDosha         = mangalHouses.includes(marsHouseFromLagna)
                              || mangalHouses.includes(marsHouseFromMoon)
                              || mangalHouses.includes(marsHouseFromVenus);
    doshas.push({
      name: "Mangal Dosha",
      present: mangalDosha,
      description: "Mars in sensitive houses — caution in marriage matters",
    });

    // Kaal Sarp Dosha: all planets between Rahu and Ketu axis
    const rahuLon = byName.Rahu.longitude;
    const ketuLon = byName.Ketu.longitude;
    const [axisStart, axisEnd] = rahuLon < ketuLon
      ? [rahuLon, ketuLon]
      : [ketuLon, rahuLon];
    const otherPlanets = planets.filter(p => !["Rahu","Ketu"].includes(p.name));
    const allBetween   = otherPlanets.every(p => {
      if (axisStart < axisEnd) return p.longitude > axisStart && p.longitude < axisEnd;
      return p.longitude > axisStart || p.longitude < axisEnd;
    });
    doshas.push({
      name: "Kaal Sarp",
      present: allBetween,
      description: "All planets hemmed between Rahu-Ketu — karmic delays, eventual rise",
    });

    // Pitra Dosha: Sun afflicted by Rahu/Saturn in 9th house or conjunction
    const sunHouse      = getHouseOfPlanet(byName.Sun, lagna.rashi);
    const rahuConjSun   = byName.Rahu.rashi === byName.Sun.rashi;
    const saturnConjSun = byName.Saturn.rashi === byName.Sun.rashi;
    doshas.push({
      name: "Pitra Dosha",
      present: (sunHouse === 9 && (rahuConjSun || saturnConjSun)) || rahuConjSun,
      description: "Sun + Rahu/Saturn — ancestral karma, requires ritual remedies",
    });

    // Sade Sati: Saturn transiting 12th, 1st, or 2nd from Moon natal rashi
    // Using Saturn's birth chart position as approximation
    const satFromMoon = ((byName.Saturn.rashi - byName.Moon.rashi + 12) % 12);
    doshas.push({
      name: "Sade Sati",
      present: satFromMoon === 0 || satFromMoon === 1 || satFromMoon === 11,
      description: "Saturn near natal Moon — period of testing, growth through hardship",
    });

    return doshas;
  }

  // ── Navamsa (D9) ──────────────────────────────────────────────────────────
  function calcNavamsa(planets) {
    return planets.map(p => {
      const navLon  = (p.longitude * 9) % 360;
      const navRashi = Math.floor(navLon / 30);
      return {
        name:      p.name,
        abbr:      p.abbr,
        rashi:     navRashi,
        rashiName: RASHI_NAMES[navRashi],
        degree:    navLon % 30,
        longitude: navLon,
      };
    });
  }

  // ── Predictions ───────────────────────────────────────────────────────────
  function generatePredictions(planets, lagna, yogas, dashaInfo) {
    const byName = {};
    planets.forEach(p => { byName[p.name] = p; });

    const lagnaName = lagna.rashiName;
    const sunHouse  = getHouseOfPlanet(byName.Sun, lagna.rashi);
    const jupHouse  = getHouseOfPlanet(byName.Jupiter, lagna.rashi);
    const moonHouse = getHouseOfPlanet(byName.Moon, lagna.rashi);
    const venHouse  = getHouseOfPlanet(byName.Venus, lagna.rashi);

    const careerHints = {
      1: "leadership, self-employment", 2: "finance, banking", 3: "communication, media",
      4: "real estate, education", 5: "speculation, creative fields", 6: "service, medicine",
      7: "business partnerships, trade", 8: "research, occult", 9: "law, religion, academics",
      10: "government, management", 11: "networking, gains", 12: "foreign lands, spirituality",
    };

    return {
      career: `With ${lagnaName} lagna and Sun in the ${sunHouse}th house (${careerHints[sunHouse] || "diverse fields"}), your strength lies in ${jupHouse <= 6 ? "professional growth and leadership" : "wisdom-driven endeavors"}. Jupiter's placement indicates ${byName.Jupiter.status === "Exalted" ? "exceptional professional fortune" : "steady career progress"}.`,
      marriage: `Venus in the ${venHouse}th house ${byName.Venus.status === "Exalted" ? "strongly blessed" : venHouse === 7 ? "directly influencing" : "influencing"} marriage. ${byName.Saturn.rashi === byName.Venus.rashi ? "Saturn's aspect suggests delays; marriage after 28 is favorable." : "Marriage prospects are generally positive."} Moon in ${byName.Moon.rashiName} indicates ${moonHouse <= 6 ? "early emotional bonding" : "mature emotional depth in relationships"}.`,
      health: `${lagnaName} lagna natives should watch ${["Aries","Scorpio"].includes(lagnaName) ? "head and blood pressure" : ["Taurus","Libra"].includes(lagnaName) ? "throat and kidneys" : ["Gemini","Virgo"].includes(lagnaName) ? "lungs and nervous system" : ["Cancer","Pisces"].includes(lagnaName) ? "digestive system and lymph" : ["Leo"].includes(lagnaName) ? "heart and spine" : "joints and bones"}. ${byName.Saturn.status === "Exalted" ? "Saturn well-placed helps longevity." : "Regular wellness routines are recommended."}`,
      remedies: generateRemedies(planets, lagna),
    };
  }

  function generateRemedies(planets, lagna) {
    const remedies = [];
    planets.forEach(p => {
      if (p.status === "Debilitated") {
        const rem = {
          Sun:     "Offer water to the Sun at sunrise; recite Aditya Hridayam",
          Moon:    "Wear pearl; offer milk to Shiva on Mondays",
          Mars:    "Recite Hanuman Chalisa on Tuesdays; donate red items",
          Mercury: "Wear emerald; donate green items on Wednesdays",
          Jupiter: "Wear yellow sapphire; worship Brihaspati on Thursdays",
          Venus:   "Wear diamond or white sapphire; worship Lakshmi on Fridays",
          Saturn:  "Light sesame oil lamp on Saturdays; recite Shani Stotra",
          Rahu:    "Donate blue items on Saturdays; worship Durga",
          Ketu:    "Donate multi-colored blankets; worship Ganesha",
        };
        if (rem[p.name]) remedies.push(`${p.name} (Debilitated): ${rem[p.name]}`);
      }
    });
    if (remedies.length === 0) remedies.push("No major planetary weaknesses detected. Continue regular worship and charitable activities.");
    return remedies;
  }

  // ── Utility ───────────────────────────────────────────────────────────────
  function jdToDate(jd) {
    const z = Math.floor(jd + 0.5);
    const f = jd + 0.5 - z;
    let A = z;
    if (z >= 2299161) {
      const alpha = Math.floor((z - 1867216.25) / 36524.25);
      A = z + 1 + alpha - Math.floor(alpha / 4);
    }
    const B = A + 1524;
    const C = Math.floor((B - 122.1) / 365.25);
    const D = Math.floor(365.25 * C);
    const E = Math.floor((B - D) / 30.6001);
    const day   = B - D - Math.floor(30.6001 * E);
    const month = E < 14 ? E - 1 : E - 13;
    const year  = month > 2 ? C - 4716 : C - 4715;
    const hour  = f * 24;
    const hh    = Math.floor(hour);
    const mm    = Math.floor((hour - hh) * 60);
    return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  }

  function addYears(date, years) {
    const d   = new Date(date);
    const frac = years - Math.floor(years);
    d.setFullYear(d.getFullYear() + Math.floor(years));
    d.setDate(d.getDate() + Math.round(frac * 365.25));
    return d;
  }

  function fmtDate(d) {
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toISOString().split("T")[0];
  }

  // ── Main export ───────────────────────────────────────────────────────────
  function calculate(birthData) {
    const jd      = jdFromBirthData(birthData);
    const planets = getAllPlanets(jd);
    const lagna   = calcLagna(jd, birthData.lat, birthData.lng);
    const houses  = calcHouses(lagna);

    // Add house number to each planet
    planets.forEach(p => {
      p.house = getHouseOfPlanet(p, lagna.rashi);
    });

    const moonPlanet  = planets.find(p => p.name === "Moon");
    const dashaInfo   = calcDasha(moonPlanet.longitude, jd);
    const antardashas = calcAntardashas(dashaInfo.current);
    const yogas       = detectYogas(planets, lagna);
    const doshas      = detectDoshas(planets, lagna, dashaInfo);
    const navamsa     = calcNavamsa(planets);
    const predictions = generatePredictions(planets, lagna, yogas, dashaInfo);

    return {
      birthData,
      jd,
      ayanamsa: lahiriAyanamsa(jd),
      lagna,
      planets,
      houses,
      dasha:      dashaInfo,
      antardashas,
      yogas,
      doshas,
      navamsa,
      predictions,
    };
  }

  window.KundaliEngine = { calculate };
})();
