/**
 * Kundali Engine v2 — Corrected Vedic Astrology Calculator
 * Fixes: Lahiri Ayanamsa, planet L1 coefficients, Lagna quadrant
 * Reference: Meeus "Astronomical Algorithms" 2nd Ed.
 */
(function () {
  "use strict";

  const DEG = Math.PI / 180;
  const RAD = 180 / Math.PI;

  const RASHI_NAMES = [
    "Mesh","Vrishabh","Mithun","Kark","Simha","Kanya",
    "Tula","Vrishchik","Dhanu","Makar","Kumbh","Meen"
  ];

  const PLANET_NAMES = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];
  const PLANET_ABBR  = ["Su","Mo","Ma","Me","Ju","Ve","Sa","Ra","Ke"];

  const NAKSHATRA_DATA = [
    {name:"Ashwini",       lord:"Ketu",    years:7 },
    {name:"Bharani",       lord:"Venus",   years:20},
    {name:"Krittika",      lord:"Sun",     years:6 },
    {name:"Rohini",        lord:"Moon",    years:10},
    {name:"Mrigashira",    lord:"Mars",    years:7 },
    {name:"Ardra",         lord:"Rahu",    years:18},
    {name:"Punarvasu",     lord:"Jupiter", years:16},
    {name:"Pushya",        lord:"Saturn",  years:19},
    {name:"Ashlesha",      lord:"Mercury", years:17},
    {name:"Magha",         lord:"Ketu",    years:7 },
    {name:"Purva Phalguni",lord:"Venus",   years:20},
    {name:"Uttara Phalguni",lord:"Sun",    years:6 },
    {name:"Hasta",         lord:"Moon",    years:10},
    {name:"Chitra",        lord:"Mars",    years:7 },
    {name:"Swati",         lord:"Rahu",    years:18},
    {name:"Vishakha",      lord:"Jupiter", years:16},
    {name:"Anuradha",      lord:"Saturn",  years:19},
    {name:"Jyeshtha",      lord:"Mercury", years:17},
    {name:"Mula",          lord:"Ketu",    years:7 },
    {name:"Purva Ashadha", lord:"Venus",   years:20},
    {name:"Uttara Ashadha",lord:"Sun",     years:6 },
    {name:"Shravana",      lord:"Moon",    years:10},
    {name:"Dhanishtha",    lord:"Mars",    years:7 },
    {name:"Shatabhisha",   lord:"Rahu",    years:18},
    {name:"Purva Bhadrapada",lord:"Jupiter",years:16},
    {name:"Uttara Bhadrapada",lord:"Saturn",years:19},
    {name:"Revati",        lord:"Mercury", years:17},
  ];

  const DASHA_ORDER = ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"];
  const DASHA_YEARS = {Ketu:7,Venus:20,Sun:6,Moon:10,Mars:7,Rahu:18,Jupiter:16,Saturn:19,Mercury:17};
  const TOTAL_DASHA_YEARS = 120;

  // Sidereal exaltation/debilitation/own (in sidereal degrees)
  const PLANET_STATUS = {
    Sun:     {exalt:0,   debil:180, own:[120]     },
    Moon:    {exalt:33,  debil:213, own:[90]       },
    Mars:    {exalt:268, debil:88,  own:[0,210]    },
    Mercury: {exalt:165, debil:345, own:[60,150]   },
    Jupiter: {exalt:95,  debil:275, own:[240,330]  },
    Venus:   {exalt:357, debil:177, own:[30,180]   },
    Saturn:  {exalt:200, debil:20,  own:[270,300]  },
    Rahu:    {exalt:60,  debil:240, own:[]         },
    Ketu:    {exalt:240, debil:60,  own:[]         },
  };

  // ── Julian Day Number ────────────────────────────────────────────────────
  function toJD(year, month, day, hour, minute, second) {
    if (month <= 2) { year--; month += 12; }
    const A = Math.floor(year / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (year + 4716))
         + Math.floor(30.6001 * (month + 1))
         + day + B - 1524.5
         + (hour + minute / 60 + (second || 0) / 3600) / 24;
  }

  function jdFromBirthData(bd) {
    const [y, m, d] = bd.date.split("-").map(Number);
    const [hr, mn]  = bd.time.split(":").map(Number);
    const utcHour   = hr - Number(bd.timezone);
    // Handle day rollover
    let dy = d, mo = m, yr = y, uh = utcHour;
    if (uh < 0)  { uh += 24; dy -= 1; }
    if (uh >= 24){ uh -= 24; dy += 1; }
    return toJD(yr, mo, dy, uh, mn, 0);
  }

  // ── Normalize angle to [0, 360) ──────────────────────────────────────────
  function norm360(x) { return ((x % 360) + 360) % 360; }

  // ── Lahiri Ayanamsa (Chitrapaksha) — corrected ──────────────────────────
  // Reference: 23.85472° at J2000.0 (Jan 1.5, 2000 UT)
  // Precession rate: 50.2796" / year = 0.01397° / year
  function lahiriAyanamsa(jd) {
    const T = (jd - 2451545.0) / 365.25; // Julian years from J2000
    return 23.85472 + 0.013969 * T;
  }

  // ── Sun (Meeus Ch.25, accurate to ~0.01°) ───────────────────────────────
  function sunLongitude(jd) {
    const n = jd - 2451545.0;
    const T = n / 36525.0;
    const L0 = norm360(280.46646 + 0.9856473 * n);
    const M  = norm360(357.52911 + 0.98560028 * n) * DEG;
    const C  = (1.914602 - 0.004817*T - 0.000014*T*T) * Math.sin(M)
             + (0.019993 - 0.000101*T) * Math.sin(2*M)
             +  0.000289 * Math.sin(3*M);
    const sunLon = norm360(L0 + C);
    // Apparent: apply aberration (~-20.4")
    return norm360(sunLon - 0.00569 - 0.00478 * Math.sin(norm360(125.04 - 1934.136*T) * DEG));
  }

  // ── Moon (Meeus Ch.47 simplified, accurate to ~0.1°) ────────────────────
  function moonLongitude(jd) {
    const n = jd - 2451545.0;
    const T = n / 36525.0;
    // Fundamental arguments
    const Lp = norm360(218.3165 + 13.176396 * n);       // Moon mean longitude
    const M  = norm360(357.5291 +  0.985600 * n) * DEG; // Sun mean anomaly
    const Mp = norm360(134.9634 + 13.064993 * n) * DEG; // Moon mean anomaly
    const D  = norm360(297.8502 + 12.190749 * n) * DEG; // Moon elongation
    const F  = norm360( 93.2721 + 13.229350 * n) * DEG; // Moon arg latitude
    const lon = Lp
      + 6.2888 * Math.sin(Mp)
      - 1.2740 * Math.sin(2*D - Mp)
      + 0.6583 * Math.sin(2*D)
      - 0.1858 * Math.sin(M)
      - 0.0587 * Math.sin(2*D - 2*Mp)
      - 0.0559 * Math.sin(2*D - M - Mp)
      + 0.0533 * Math.sin(2*D + Mp)
      + 0.0460 * Math.sin(2*D - M)
      + 0.0412 * Math.sin(Mp - M)
      - 0.0355 * Math.sin(D)
      - 0.0323 * Math.sin(Mp + M)
      - 0.0148 * Math.sin(2*F - 2*D)
      + 0.0109 * Math.sin(Mp - 4*D)
      - 0.0108 * Math.sin(3*Mp);
    return norm360(lon);
  }

  // ── Outer/inner planets using Meeus Table 33.a coefficients ─────────────
  // L = mean longitude (deg), L1 = rate (deg/century)
  // M = mean anomaly (deg), equation of center
  function planetLon(jd, L0, L1, M0, M1, eqC1, eqC2, eqC3) {
    const T = (jd - 2451545.0) / 36525.0;
    const L = norm360(L0 + L1 * T);
    const M = norm360(M0 + M1 * T) * DEG;
    const C = eqC1 * Math.sin(M)
            + eqC2 * Math.sin(2*M)
            + (eqC3||0) * Math.sin(3*M);
    return norm360(L + C);
  }

  // Corrected coefficients from Meeus Table 33.a
  function marsLongitude(jd) {
    return planetLon(jd,
      355.4333, 19140.2993,  // L0, L1 (deg/century)
      19.3730,  19138.8776,  // M0, M1
      10.6912, 0.6228, 0.0503
    );
  }

  function mercuryLongitude(jd) {
    return planetLon(jd,
      252.2503, 149474.0714,
      174.7948, 149472.5153,
      23.4400, 2.9818, 0.5255
    );
  }

  function jupiterLongitude(jd) {
    return planetLon(jd,
      34.3515, 3034.9057,
      20.9862, 3033.6272,
      5.5549, 0.1683, 0.0071
    );
  }

  function venusLongitude(jd) {
    return planetLon(jd,
      181.9798, 58519.2117,
      50.4161,  58517.8039,
      0.7758, 0.0033, 0
    );
  }

  function saturnLongitude(jd) {
    return planetLon(jd,
      50.0774, 1223.5096,
      317.0207, 1222.1138,
      6.3585, 0.2204, 0.0106
    );
  }

  // Rahu (Mean North Node) — retrograde, Meeus Ch.22
  function rahuLongitude(jd) {
    const T = (jd - 2451545.0) / 36525.0;
    const omega = 125.04452 - 1934.136261 * T
                + 0.0020708 * T * T
                + T * T * T / 450000;
    return norm360(omega);
  }

  // ── All 9 planets ─────────────────────────────────────────────────────────
  function getAllPlanets(jd) {
    const ayan = lahiriAyanamsa(jd);
    const tropLons = [
      sunLongitude(jd),
      moonLongitude(jd),
      marsLongitude(jd),
      mercuryLongitude(jd),
      jupiterLongitude(jd),
      venusLongitude(jd),
      saturnLongitude(jd),
      rahuLongitude(jd),
      norm360(rahuLongitude(jd) + 180), // Ketu
    ];

    return tropLons.map((trop, i) => {
      const sid  = norm360(trop - ayan);
      const rashi = Math.floor(sid / 30);
      const deg   = sid - rashi * 30;
      const nakIdx = Math.floor(sid / (360 / 27));
      const nakFrac = (sid % (360 / 27)) / (360 / 27);
      const pada   = Math.floor(nakFrac * 4) + 1;
      return {
        name:         PLANET_NAMES[i],
        abbr:         PLANET_ABBR[i],
        longitude:    sid,
        tropLon:      trop,
        rashi,
        rashiName:    RASHI_NAMES[rashi],
        degree:       deg,
        nakshatra:    NAKSHATRA_DATA[nakIdx].name,
        nakshatraLord:NAKSHATRA_DATA[nakIdx].lord,
        pada,
        status:       getPlanetStatus(PLANET_NAMES[i], sid),
      };
    });
  }

  function getPlanetStatus(name, sid) {
    const d = PLANET_STATUS[name];
    if (!d) return "Neutral";
    const rashi      = Math.floor(sid / 30);
    const exaltRashi = Math.floor(d.exalt / 30);
    const debilRashi = Math.floor(d.debil / 30);
    const ownRashis  = d.own.map(l => Math.floor(l / 30));
    if (rashi === exaltRashi) return "Exalted";
    if (rashi === debilRashi) return "Debilitated";
    if (ownRashis.includes(rashi)) return "Own Sign";
    return "Neutral";
  }

  // ── Lagna (Ascendant) — corrected quadrant logic ─────────────────────────
  function calcLagna(jd, lat, lng) {
    const T = (jd - 2451545.0) / 36525.0;

    // GMST at 0h UT of the JD day (Meeus Ch.12)
    const JD0  = Math.floor(jd - 0.5) + 0.5; // 0h UT
    const T0   = (JD0 - 2451545.0) / 36525.0;
    const GMST0 = 100.4606184 + 36000.77004 * T0 + 0.000387933 * T0 * T0;

    // Add UT hours
    const utHours = (jd - JD0) * 24.0;
    const GMST    = norm360(GMST0 + 360.98564724 * utHours / 24.0);

    // Local Sidereal Time
    const LST  = norm360(GMST + lng);
    const RAMC = LST; // Right Ascension of Midheaven Culmination

    // Obliquity of ecliptic
    const eps  = (23.439291111 - 0.013004167*T - 0.000000164*T*T + 0.000000504*T*T*T) * DEG;
    const latR = lat * DEG;
    const ramcR = RAMC * DEG;

    // Ascendant formula (Meeus Ch.31)
    const y = -Math.cos(ramcR);
    const x =  Math.sin(ramcR) * Math.cos(eps) + Math.tan(latR) * Math.sin(eps);
    let asc = Math.atan2(y, x) * RAD;
    if (asc < 0) asc += 360;

    // Correct quadrant: ascendant must be in the right half of sky
    if (Math.cos(ramcR) > 0 && asc < 180) asc += 180;
    if (Math.cos(ramcR) < 0 && asc > 180) asc -= 180;

    const ayan   = lahiriAyanamsa(jd);
    const sidAsc = norm360(asc - ayan);
    return {
      longitude: sidAsc,
      tropLon:   asc,
      rashi:     Math.floor(sidAsc / 30),
      rashiName: RASHI_NAMES[Math.floor(sidAsc / 30)],
      degree:    sidAsc % 30,
    };
  }

  // ── Houses (Whole Sign) ───────────────────────────────────────────────────
  function calcHouses(lagna) {
    return Array.from({length:12}, (_, i) => {
      const r = (lagna.rashi + i) % 12;
      return {house: i+1, rashi: r, rashiName: RASHI_NAMES[r]};
    });
  }

  function getHouseOfPlanet(planet, lagnaRashi) {
    return ((planet.rashi - lagnaRashi + 12) % 12) + 1;
  }

  // ── Vimshottari Dasha ─────────────────────────────────────────────────────
  function calcDasha(moonSidLon, jd) {
    const NAK_SPAN  = 360 / 27;
    const nakIdx    = Math.floor(moonSidLon / NAK_SPAN);
    const nak       = NAKSHATRA_DATA[nakIdx];
    const elapsed   = (moonSidLon % NAK_SPAN) / NAK_SPAN; // fraction traversed

    // Years already elapsed in current dasha at birth
    const elapsedYrs   = elapsed * nak.years;
    const remainingYrs = nak.years - elapsedYrs;

    const lordIdx = DASHA_ORDER.indexOf(nak.lord);
    const dashas  = [];
    let cursor    = new Date(jdToDateStr(jd));

    // First partial dasha
    dashas.push({
      lord:  nak.lord,
      years: nak.years,
      start: fmtDate(cursor),
      end:   fmtDate(addYears(cursor, remainingYrs)),
    });
    cursor = addYears(cursor, remainingYrs);

    for (let i = 1; i < DASHA_ORDER.length; i++) {
      const lord = DASHA_ORDER[(lordIdx + i) % DASHA_ORDER.length];
      const yrs  = DASHA_YEARS[lord];
      const end  = addYears(cursor, yrs);
      dashas.push({lord, years:yrs, start:fmtDate(cursor), end:fmtDate(end)});
      cursor = end;
    }

    const today   = new Date();
    const current = dashas.find(d => new Date(d.start) <= today && new Date(d.end) > today) || dashas[0];

    return {dashas, current, nakshatra: nak.name, nakshatraLord: nak.lord};
  }

  function calcAntardashas(mahadasha) {
    const lordIdx = DASHA_ORDER.indexOf(mahadasha.lord);
    const total   = DASHA_YEARS[mahadasha.lord];
    let cursor    = new Date(mahadasha.start);
    return DASHA_ORDER.map((_, i) => {
      const lord = DASHA_ORDER[(lordIdx + i) % DASHA_ORDER.length];
      const days = (DASHA_YEARS[lord] / TOTAL_DASHA_YEARS) * total * 365.25;
      const end  = new Date(cursor.getTime() + days * 86400000);
      const antar = {lord, start: fmtDate(cursor), end: fmtDate(end)};
      cursor = end;
      return antar;
    });
  }

  // ── Yogas ─────────────────────────────────────────────────────────────────
  function detectYogas(planets, lagna) {
    const b = {};
    planets.forEach(p => { b[p.name] = p; });

    // Gaja Kesari: Jupiter in 1,4,7,10 from Moon
    const jupFromMoon = ((b.Jupiter.rashi - b.Moon.rashi + 12) % 12) + 1;

    // Hamsa: Jupiter in own/exalted in kendra from lagna
    const jupFromLagna = getHouseOfPlanet(b.Jupiter, lagna.rashi);

    // Vipreet: lords of 6,8,12 placed in 6,8,12
    const dusthanaRashis = [5,7,11].map(i => (lagna.rashi + i) % 12);
    const dustPlanets = planets.filter(p => dusthanaRashis.includes(p.rashi));

    // Dhana: 2nd lord + 11th lord in same rashi
    const h2Rashi  = (lagna.rashi + 1) % 12;
    const h11Rashi = (lagna.rashi + 10) % 12;
    const h2Planets  = planets.filter(p => p.rashi === h2Rashi  && !["Rahu","Ketu"].includes(p.name));
    const h11Planets = planets.filter(p => p.rashi === h11Rashi && !["Rahu","Ketu"].includes(p.name));
    const dhana = h2Planets.some(p => h11Planets.some(q => p.rashi === q.rashi) || h2Rashi === h11Rashi);

    // Kendra-Trikona Raja Yoga
    const kendraRashis  = [0,3,6,9].map(i => (lagna.rashi + i) % 12);
    const trikonaRashis = [0,4,8].map(i => (lagna.rashi + i) % 12);
    let rajaYoga = false;
    for (let i = 0; i < planets.length; i++) {
      for (let j = i+1; j < planets.length; j++) {
        if (planets[i].rashi === planets[j].rashi) {
          const r = planets[i].rashi;
          if ((kendraRashis.includes(r) || trikonaRashis.includes(r)) && r !== lagna.rashi) {
            rajaYoga = true;
          }
        }
      }
    }

    return [
      {name:"Gaja Kesari",            present:[1,4,7,10].includes(jupFromMoon),  description:"Jupiter in kendra from Moon — wisdom, fame, prosperity"},
      {name:"Budhaditya",             present:b.Sun.rashi === b.Mercury.rashi,   description:"Sun & Mercury conjunct — sharp intellect, eloquence"},
      {name:"Hamsa",                  present:[1,4,7,10].includes(jupFromLagna) && ["Exalted","Own Sign"].includes(b.Jupiter.status), description:"Jupiter strong in kendra — divine grace, righteous fame"},
      {name:"Vipreet Raj",            present:dustPlanets.length >= 2,           description:"Lords of 6/8/12 in dusthanas — rise after adversity"},
      {name:"Dhana Yoga",             present:dhana,                             description:"2nd & 11th lords together — wealth accumulation"},
      {name:"Kendra-Trikona Raja",    present:rajaYoga,                          description:"Kendra & trikona lords conjunct — power, authority"},
    ];
  }

  // ── Doshas ────────────────────────────────────────────────────────────────
  function detectDoshas(planets, lagna) {
    const b = {};
    planets.forEach(p => { b[p.name] = p; });

    // Mangal Dosha: Mars in 1,2,4,7,8,12 from lagna
    const mangalHouses = [1,2,4,7,8,12];
    const marsH = getHouseOfPlanet(b.Mars, lagna.rashi);
    const mangal = mangalHouses.includes(marsH);

    // Kaal Sarp: all planets between Rahu-Ketu axis
    const ra = b.Rahu.longitude;
    const ke = b.Ketu.longitude;
    const others = planets.filter(p => !["Rahu","Ketu"].includes(p.name));
    const inArc = (lon, start, end) => {
      const s = norm360(start), e = norm360(end);
      if (s < e) return lon > s && lon < e;
      return lon > s || lon < e;
    };
    const allInRaKe = others.every(p => inArc(p.longitude, ra, ke));
    const allInKeRa = others.every(p => inArc(p.longitude, ke, ra));
    const kaalSarp  = allInRaKe || allInKeRa;

    // Pitra: Sun + Rahu conjunct, or Sun in 9H with Rahu/Saturn
    const sunH       = getHouseOfPlanet(b.Sun, lagna.rashi);
    const pitra      = b.Rahu.rashi === b.Sun.rashi
                    || (sunH === 9 && (b.Rahu.rashi === b.Sun.rashi || b.Saturn.rashi === b.Sun.rashi));

    // Sade Sati (natal chart approximation): Saturn in 12,1,2 from Moon rashi
    const satFromMoon = (b.Saturn.rashi - b.Moon.rashi + 12) % 12;
    const sadeSati    = satFromMoon === 0 || satFromMoon === 1 || satFromMoon === 11;

    return [
      {name:"Mangal Dosha", present:mangal,   description:"Mars in 1/2/4/7/8/12 from Lagna — caution in marriage matters"},
      {name:"Kaal Sarp",    present:kaalSarp, description:"All planets hemmed between Rahu-Ketu — karmic delays, eventual rise"},
      {name:"Pitra Dosha",  present:pitra,    description:"Sun afflicted by Rahu/Saturn — ancestral karma, requires ritual"},
      {name:"Sade Sati",    present:sadeSati, description:"Saturn near natal Moon — period of testing and growth"},
    ];
  }

  // ── Navamsa (D9) ─────────────────────────────────────────────────────────
  function calcNavamsa(planets) {
    return planets.map(p => {
      // Each rashi = 9 navamsa padas. Each pada = 3°20'.
      // Navamsa starts: Fire→Mesh, Earth→Makar, Air→Tula, Water→Kark
      const rashiElement = [0,2,1,3, 0,2,1,3, 0,2,1,3]; // 0=fire,1=earth,2=air,3=water
      const navStart     = [0,9,6,3]; // mesh,makar,tula,kark (rashi index)
      const padaSize     = 30 / 9;    // 3.333°
      const padas        = Math.floor(p.longitude / padaSize); // 0-107
      const rashiPada    = padas % 9;
      const birthRashi   = Math.floor(p.longitude / 30);
      const elem         = rashiElement[birthRashi];
      const navRashi     = (navStart[elem] + rashiPada) % 12;
      return {
        name:      p.name,
        abbr:      p.abbr,
        rashi:     navRashi,
        rashiName: RASHI_NAMES[navRashi],
        degree:    (p.longitude % padaSize) / padaSize * 30,
        longitude: navRashi * 30 + (p.longitude % padaSize) / padaSize * 30,
      };
    });
  }

  // ── Predictions ───────────────────────────────────────────────────────────
  function generatePredictions(planets, lagna, yogas) {
    const b = {};
    planets.forEach(p => { b[p.name] = p; });

    const sunH = getHouseOfPlanet(b.Sun, lagna.rashi);
    const jupH = getHouseOfPlanet(b.Jupiter, lagna.rashi);
    const venH = getHouseOfPlanet(b.Venus, lagna.rashi);
    const moonH = getHouseOfPlanet(b.Moon, lagna.rashi);

    const careerMap = {
      1:"leadership, self-employment, politics",
      2:"finance, banking, speech",
      3:"media, writing, communication",
      4:"real estate, education, vehicles",
      5:"speculation, creative arts, children",
      6:"service, medicine, law",
      7:"business partnerships, trade",
      8:"research, occult, insurance",
      9:"law, religion, academics, foreign travel",
      10:"government, management, profession",
      11:"networking, gains, elder siblings",
      12:"foreign lands, spirituality, hospitals",
    };

    return {
      career: `${lagna.rashiName} lagna with Sun in ${sunH}th house (${careerMap[sunH]}) indicates strong aptitude in these fields. Jupiter in ${jupH}th house ${b.Jupiter.status === "Exalted" ? "is exalted bringing exceptional fortune" : b.Jupiter.status === "Own Sign" ? "in own sign gives steady growth" : "gives gradual career progress"}.`,
      marriage: `Venus in ${venH}th house (${b.Venus.rashiName}) ${b.Venus.status === "Exalted" ? "is exalted — excellent for marriage prospects" : b.Venus.status === "Debilitated" ? "is debilitated — marriage requires patience and understanding" : "gives balanced relationship prospects"}. ${b.Saturn.rashi === b.Venus.rashi ? "Saturn conjunct Venus may delay marriage — patience after age 28 is advised." : ""} Moon in ${b.Moon.rashiName} in ${moonH}th house reflects ${moonH <= 4 ? "nurturing, family-oriented" : moonH <= 8 ? "emotionally expressive" : "spiritually inclined"} nature in relationships.`,
      health: `${lagna.rashiName} lagna: Watch your ${({Mesh:"head, blood pressure",Vrishabh:"throat, neck, thyroid",Mithun:"lungs, nervous system, arms",Kark:"stomach, chest, digestion",Simha:"heart, spine, eyes",Kanya:"intestines, digestive system",Tula:"kidneys, lower back",Vrishchik:"reproductive organs, urinary",Dhanu:"hips, thighs, liver",Makar:"knees, bones, joints",Kumbh:"ankles, circulatory system",Meen:"feet, lymphatic system"})[lagna.rashiName] || "overall health"}. ${b.Saturn.status === "Exalted" || b.Saturn.status === "Own Sign" ? "Strong Saturn supports longevity." : "Regular health checkups recommended."}`,
      remedies: generateRemedies(planets, lagna),
    };
  }

  function generateRemedies(planets, lagna) {
    const remMap = {
      Sun:     "Offer water to Sun at sunrise daily; recite Aditya Hridayam on Sundays; donate wheat/copper",
      Moon:    "Wear pearl in silver on right hand; offer milk to Lord Shiva on Mondays; respect mother",
      Mars:    "Recite Hanuman Chalisa on Tuesdays; donate red lentils; worship Lord Hanuman",
      Mercury: "Wear emerald in gold; donate green moong dal on Wednesdays; worship Lord Vishnu",
      Jupiter: "Wear yellow sapphire; worship Brihaspati on Thursdays; donate yellow items",
      Venus:   "Wear diamond or white sapphire; worship Goddess Lakshmi on Fridays; donate white items",
      Saturn:  "Light sesame oil lamp under Peepal tree on Saturdays; recite Shani Stotra; donate black sesame",
      Rahu:    "Donate blue/black items on Saturdays; worship Goddess Durga; recite Rahu mantra",
      Ketu:    "Donate multi-colored items; worship Lord Ganesha; recite Ketu mantra",
    };
    const debilitated = planets.filter(p => p.status === "Debilitated");
    if (!debilitated.length) return ["No major planetary weaknesses detected. Continue regular worship and charitable activities for overall wellbeing."];
    return debilitated.map(p => `${p.name} (Debilitated in ${p.rashiName}): ${remMap[p.name]}`);
  }

  // ── Utilities ─────────────────────────────────────────────────────────────
  function jdToDateStr(jd) {
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
    return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  }

  function addYears(date, years) {
    const d = new Date(date instanceof Date ? date.getTime() : date);
    const days = years * 365.25;
    d.setTime(d.getTime() + days * 86400000);
    return d;
  }

  function fmtDate(d) {
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toISOString().split("T")[0];
  }

  // ── Main Export ───────────────────────────────────────────────────────────
  function calculate(birthData) {
    const jd      = jdFromBirthData(birthData);
    const ayanamsa = lahiriAyanamsa(jd);
    const planets = getAllPlanets(jd);
    const lagna   = calcLagna(jd, Number(birthData.lat), Number(birthData.lng));
    const houses  = calcHouses(lagna);

    planets.forEach(p => { p.house = getHouseOfPlanet(p, lagna.rashi); });

    const moon       = planets.find(p => p.name === "Moon");
    const dasha      = calcDasha(moon.longitude, jd);
    const antardashas = calcAntardashas(dasha.current);
    const yogas      = detectYogas(planets, lagna);
    const doshas     = detectDoshas(planets, lagna);
    const navamsa    = calcNavamsa(planets);
    const predictions = generatePredictions(planets, lagna, yogas);

    return {birthData, jd, ayanamsa, lagna, planets, houses, dasha, antardashas, yogas, doshas, navamsa, predictions};
  }

  window.KundaliEngine = { calculate };
})();
