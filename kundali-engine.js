/**
 * Kundali Engine v3 — Corrected Geocentric Vedic Astrology Calculator
 * Fixes: Lagna 180° quadrant bug, Mercury/Venus geocentric conversion
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
    {name:"Ashwini",          lord:"Ketu",    years:7 },
    {name:"Bharani",          lord:"Venus",   years:20},
    {name:"Krittika",         lord:"Sun",     years:6 },
    {name:"Rohini",           lord:"Moon",    years:10},
    {name:"Mrigashira",       lord:"Mars",    years:7 },
    {name:"Ardra",            lord:"Rahu",    years:18},
    {name:"Punarvasu",        lord:"Jupiter", years:16},
    {name:"Pushya",           lord:"Saturn",  years:19},
    {name:"Ashlesha",         lord:"Mercury", years:17},
    {name:"Magha",            lord:"Ketu",    years:7 },
    {name:"Purva Phalguni",   lord:"Venus",   years:20},
    {name:"Uttara Phalguni",  lord:"Sun",     years:6 },
    {name:"Hasta",            lord:"Moon",    years:10},
    {name:"Chitra",           lord:"Mars",    years:7 },
    {name:"Swati",            lord:"Rahu",    years:18},
    {name:"Vishakha",         lord:"Jupiter", years:16},
    {name:"Anuradha",         lord:"Saturn",  years:19},
    {name:"Jyeshtha",         lord:"Mercury", years:17},
    {name:"Mula",             lord:"Ketu",    years:7 },
    {name:"Purva Ashadha",    lord:"Venus",   years:20},
    {name:"Uttara Ashadha",   lord:"Sun",     years:6 },
    {name:"Shravana",         lord:"Moon",    years:10},
    {name:"Dhanishtha",       lord:"Mars",    years:7 },
    {name:"Shatabhisha",      lord:"Rahu",    years:18},
    {name:"Purva Bhadrapada", lord:"Jupiter", years:16},
    {name:"Uttara Bhadrapada",lord:"Saturn",  years:19},
    {name:"Revati",           lord:"Mercury", years:17},
  ];

  const DASHA_ORDER = ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"];
  const DASHA_YEARS = {Ketu:7,Venus:20,Sun:6,Moon:10,Mars:7,Rahu:18,Jupiter:16,Saturn:19,Mercury:17};
  const TOTAL_DASHA_YEARS = 120;

  // Sidereal exaltation/debilitation/own signs
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

  // Orbital elements at J2000 (Meeus Table 33.a)
  // [L0, L1, M0, M1, e, a, i0, i1, Omega0, Omega1]
  const ORBIT = {
    Mercury: {L0:252.2503, L1:149474.0714, M0:174.7948, M1:149472.5153, e:0.20564, a:0.38710},
    Venus:   {L0:181.9798, L1: 58519.2117, M0: 50.4161, M1: 58517.8039, e:0.00677, a:0.72333},
    Mars:    {L0:355.4333, L1: 19140.2993, M0: 19.3730, M1: 19138.8776, e:0.09340, a:1.52366},
    Jupiter: {L0: 34.3515, L1:  3034.9057, M0: 20.9862, M1:  3033.6272, e:0.04839, a:5.20336},
    Saturn:  {L0: 50.0774, L1:  1223.5096, M0:317.0207, M1:  1222.1138, e:0.05415, a:9.53707},
  };

  // ── Utility ──────────────────────────────────────────────────────────────
  function norm360(x) { return ((x % 360) + 360) % 360; }
  function sinD(d)  { return Math.sin(d * DEG); }
  function cosD(d)  { return Math.cos(d * DEG); }
  function tanD(d)  { return Math.tan(d * DEG); }
  function atan2D(y,x){ return Math.atan2(y, x) * RAD; }

  // ── Julian Day Number ────────────────────────────────────────────────────
  function toJD(year, month, day, hour, minute) {
    if (month <= 2) { year--; month += 12; }
    const A = Math.floor(year / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25*(year+4716)) + Math.floor(30.6001*(month+1)) + day + B - 1524.5
         + (hour + minute/60) / 24;
  }

  function jdFromBirthData(bd) {
    const [y, m, d] = bd.date.split("-").map(Number);
    const [hr, mn]  = bd.time.split(":").map(Number);
    const tz        = Number(bd.timezone);
    // IST 5.5 → UTC: 18:22 - 5.5h = 12:52 UTC
    let utH = hr - Math.floor(tz);
    let utM = mn - Math.round((tz - Math.floor(tz)) * 60);
    if (utM < 0)  { utM += 60; utH -= 1; }
    if (utM >= 60){ utM -= 60; utH += 1; }
    let dd = d, mm = m, yy = y;
    if (utH < 0)  { utH += 24; dd -= 1; }
    if (utH >= 24){ utH -= 24; dd += 1; }
    return toJD(yy, mm, dd, utH, utM);
  }

  // ── Lahiri Ayanamsa (Chitrapaksha) ───────────────────────────────────────
  // Reference: 23.85472° at J2000.0; rate: 50.2796"/yr = 0.013969°/yr
  function lahiriAyanamsa(jd) {
    return 23.85472 + 0.013969 * ((jd - 2451545.0) / 365.25);
  }

  // ── Sun (Meeus Ch.25, accurate ~0.01°) ───────────────────────────────────
  function sunLongitude(jd) {
    const n  = jd - 2451545.0;
    const T  = n / 36525.0;
    const L0 = norm360(280.46646 + 0.9856473 * n);
    const M  = norm360(357.52911 + 0.98560028 * n);
    const C  = (1.914602 - 0.004817*T - 0.000014*T*T) * sinD(M)
             + (0.019993 - 0.000101*T) * sinD(2*M)
             + 0.000289 * sinD(3*M);
    const raw = norm360(L0 + C);
    // Apparent: aberration + nutation approximation
    const omega = norm360(125.04 - 1934.136 * T);
    return norm360(raw - 0.00569 - 0.00478 * sinD(omega));
  }

  // ── Moon (Meeus Ch.47 simplified, ~0.1° accuracy) ────────────────────────
  function moonLongitude(jd) {
    const n  = jd - 2451545.0;
    const Lp = norm360(218.3165 + 13.176396 * n);
    const M  = norm360(357.5291 +  0.985600 * n);
    const Mp = norm360(134.9634 + 13.064993 * n);
    const D  = norm360(297.8502 + 12.190749 * n);
    const F  = norm360( 93.2721 + 13.229350 * n);
    return norm360(Lp
      + 6.2888 * sinD(Mp)
      - 1.2740 * sinD(2*D - Mp)
      + 0.6583 * sinD(2*D)
      - 0.1858 * sinD(M)
      - 0.0587 * sinD(2*D - 2*Mp)
      - 0.0559 * sinD(2*D - M - Mp)
      + 0.0533 * sinD(2*D + Mp)
      + 0.0460 * sinD(2*D - M)
      + 0.0412 * sinD(Mp - M)
      - 0.0355 * sinD(D)
      - 0.0323 * sinD(Mp + M)
      - 0.0148 * sinD(2*F - 2*D)
      + 0.0109 * sinD(Mp - 4*D));
  }

  // ── Heliocentric planet longitude + radius vector ─────────────────────────
  function helioPos(jd, orb) {
    const T = (jd - 2451545.0) / 36525.0;
    const L = norm360(orb.L0 + orb.L1 * T);
    const M = norm360(orb.M0 + orb.M1 * T);
    // Equation of center
    const e = orb.e;
    const C = (2*e - e*e*e/4) * sinD(M) * RAD
            + (5*e*e/4) * sinD(2*M) * RAD
            + (13*e*e*e/12) * sinD(3*M) * RAD;
    const v   = norm360(M + C);             // true anomaly
    const lon = norm360(L + C);             // heliocentric longitude
    const r   = orb.a * (1 - e*e) / (1 + e * cosD(v)); // radius vector AU
    return {lon, r};
  }

  // ── Geocentric ecliptic longitude from heliocentric + Earth ──────────────
  function geoFromHelio(planetLon, planetR, earthLon, earthR) {
    const x = planetR * cosD(planetLon) - earthR * cosD(earthLon);
    const y = planetR * sinD(planetLon) - earthR * sinD(earthLon);
    return norm360(atan2D(y, x));
  }

  // ── All 9 planets ─────────────────────────────────────────────────────────
  function getAllPlanets(jd) {
    const ayan = lahiriAyanamsa(jd);

    // Sun (geocentric, already correct)
    const sunTrop = sunLongitude(jd);

    // Earth heliocentric (opposite of geocentric Sun)
    const earthLon = norm360(sunTrop + 180);
    const earthR   = 1.0; // approximate; true value ≈0.983-1.017

    // Moon
    const moonTrop = moonLongitude(jd);

    // Outer & inner planets — geocentric via heliocentric reduction
    function planetGeo(name) {
      const hp = helioPos(jd, ORBIT[name]);
      return geoFromHelio(hp.lon, hp.r, earthLon, earthR);
    }

    // Rahu (mean North Node, retrograde)
    const T     = (jd - 2451545.0) / 36525.0;
    const rahuT = norm360(125.04452 - 1934.136261*T + 0.0020708*T*T + T*T*T/450000);

    const tropLons = [
      sunTrop,
      moonTrop,
      planetGeo("Mars"),
      planetGeo("Mercury"),
      planetGeo("Jupiter"),
      planetGeo("Venus"),
      planetGeo("Saturn"),
      rahuT,
      norm360(rahuT + 180), // Ketu = Rahu + 180°
    ];

    return tropLons.map((trop, i) => {
      const sid     = norm360(trop - ayan);
      const rashi   = Math.floor(sid / 30);
      const deg     = sid - rashi * 30;
      const NAK     = 360 / 27;
      const nakIdx  = Math.floor(sid / NAK);
      const nakFrac = (sid % NAK) / NAK;
      const pada    = Math.floor(nakFrac * 4) + 1;
      return {
        name:          PLANET_NAMES[i],
        abbr:          PLANET_ABBR[i],
        longitude:     sid,
        tropLon:       trop,
        rashi,
        rashiName:     RASHI_NAMES[rashi],
        degree:        parseFloat(deg.toFixed(4)),
        nakshatra:     NAKSHATRA_DATA[nakIdx].name,
        nakshatraLord: NAKSHATRA_DATA[nakIdx].lord,
        pada,
        status:        getPlanetStatus(PLANET_NAMES[i], sid),
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

  // ── Lagna (Ascendant) — FIXED quadrant ───────────────────────────────────
  function calcLagna(jd, lat, lng) {
    const T = (jd - 2451545.0) / 36525.0;

    // GMST at 0h UT
    const JD0   = Math.floor(jd - 0.5) + 0.5;
    const T0    = (JD0 - 2451545.0) / 36525.0;
    const GMST0 = norm360(100.4606184 + 36000.77004*T0 + 0.000387933*T0*T0);

    // Add UT fraction
    const utH  = (jd - JD0) * 24.0;
    const GMST = norm360(GMST0 + 360.98564724 * utH / 24.0);
    const LST  = norm360(GMST + lng);  // Local Sidereal Time = RAMC

    // Obliquity
    const eps  = 23.439291111 - 0.013004167*T - 0.000000164*T*T + 0.000000504*T*T*T;
    const latR = lat * DEG;
    const LSTR = LST * DEG;
    const epsR = eps * DEG;

    // Ascendant formula (Meeus)
    // tan(asc) = -cos(LST) / (sin(LST)*cos(eps) + tan(lat)*sin(eps))
    const y = -Math.cos(LSTR);
    const x =  Math.sin(LSTR) * Math.cos(epsR) + Math.tan(latR) * Math.sin(epsR);

    // atan2 gives DESCENDANT — add 180° to get ASCENDANT
    let asc = atan2D(y, x);
    asc = norm360(asc + 180);   // ← KEY FIX: atan2 gives descendant, flip to get ascendant

    const ayan   = lahiriAyanamsa(jd);
    const sidAsc = norm360(asc - ayan);
    return {
      longitude: sidAsc,
      tropLon:   asc,
      rashi:     Math.floor(sidAsc / 30),
      rashiName: RASHI_NAMES[Math.floor(sidAsc / 30)],
      degree:    parseFloat((sidAsc % 30).toFixed(4)),
    };
  }

  // ── Houses (Whole Sign) ───────────────────────────────────────────────────
  function calcHouses(lagna) {
    return Array.from({length:12}, (_, i) => {
      const r = (lagna.rashi + i) % 12;
      return {house:i+1, rashi:r, rashiName:RASHI_NAMES[r]};
    });
  }

  function getHouseOfPlanet(planet, lagnaRashi) {
    return ((planet.rashi - lagnaRashi + 12) % 12) + 1;
  }

  // ── Vimshottari Dasha ─────────────────────────────────────────────────────
  function calcDasha(moonSidLon, jd) {
    const NAK_SPAN   = 360 / 27;
    const nakIdx     = Math.floor(moonSidLon / NAK_SPAN);
    const nak        = NAKSHATRA_DATA[nakIdx];
    const elapsed    = (moonSidLon % NAK_SPAN) / NAK_SPAN;
    const remaining  = nak.years * (1 - elapsed);

    const lordIdx = DASHA_ORDER.indexOf(nak.lord);
    const dashas  = [];
    let cursor    = new Date(jdToDateStr(jd));

    dashas.push({lord:nak.lord, years:nak.years, start:fmtDate(cursor), end:fmtDate(addYears(cursor, remaining))});
    cursor = addYears(cursor, remaining);

    for (let i = 1; i < DASHA_ORDER.length; i++) {
      const lord = DASHA_ORDER[(lordIdx + i) % DASHA_ORDER.length];
      const yrs  = DASHA_YEARS[lord];
      const end  = addYears(cursor, yrs);
      dashas.push({lord, years:yrs, start:fmtDate(cursor), end:fmtDate(end)});
      cursor = end;
    }

    const today   = new Date();
    const current = dashas.find(d => new Date(d.start) <= today && new Date(d.end) > today) || dashas[0];
    return {dashas, current, nakshatra:nak.name, nakshatraLord:nak.lord};
  }

  function calcAntardashas(maha) {
    const lordIdx = DASHA_ORDER.indexOf(maha.lord);
    const total   = DASHA_YEARS[maha.lord];
    let cursor    = new Date(maha.start);
    return DASHA_ORDER.map((_, i) => {
      const lord = DASHA_ORDER[(lordIdx + i) % DASHA_ORDER.length];
      const days = (DASHA_YEARS[lord] / TOTAL_DASHA_YEARS) * total * 365.25;
      const end  = new Date(cursor.getTime() + days * 86400000);
      const a    = {lord, start:fmtDate(cursor), end:fmtDate(end)};
      cursor = end;
      return a;
    });
  }

  // ── Yogas ─────────────────────────────────────────────────────────────────
  function detectYogas(planets, lagna) {
    const b = {};
    planets.forEach(p => { b[p.name] = p; });

    const jupFromMoon  = ((b.Jupiter.rashi - b.Moon.rashi + 12) % 12) + 1;
    const jupFromLagna = getHouseOfPlanet(b.Jupiter, lagna.rashi);

    const dusthanaRashis = [5,7,11].map(i => (lagna.rashi + i) % 12);
    const dustPlanets    = planets.filter(p => dusthanaRashis.includes(p.rashi) && !["Rahu","Ketu"].includes(p.name));

    const kendraRashis  = [0,3,6,9].map(i => (lagna.rashi + i) % 12);
    const trikonaRashis = [0,4,8].map(i => (lagna.rashi + i) % 12);
    let rajaYoga = false;
    for (let i = 0; i < planets.length; i++) {
      for (let j = i+1; j < planets.length; j++) {
        const r = planets[i].rashi;
        if (r === planets[j].rashi && (kendraRashis.includes(r) || trikonaRashis.includes(r))) {
          rajaYoga = true;
        }
      }
    }

    return [
      {name:"Gaja Kesari",         present:[1,4,7,10].includes(jupFromMoon),      description:"Jupiter in kendra from Moon — wisdom, fame, prosperity"},
      {name:"Budhaditya",          present:b.Sun.rashi === b.Mercury.rashi,        description:"Sun & Mercury conjunct — sharp intellect, eloquence"},
      {name:"Hamsa",               present:[1,4,7,10].includes(jupFromLagna) && ["Exalted","Own Sign"].includes(b.Jupiter.status), description:"Jupiter strong in kendra — divine grace, fame"},
      {name:"Vipreet Raj",         present:dustPlanets.length >= 2,               description:"Lords of 6/8/12 in dusthanas — rise after adversity"},
      {name:"Dhana Yoga",          present:b.Jupiter.rashi === b.Moon.rashi || b.Venus.rashi === b.Jupiter.rashi, description:"Wealth-giving conjunction"},
      {name:"Kendra-Trikona Raja", present:rajaYoga,                              description:"Kendra & trikona lords conjunct — power, authority"},
    ];
  }

  // ── Doshas ────────────────────────────────────────────────────────────────
  function detectDoshas(planets, lagna) {
    const b = {};
    planets.forEach(p => { b[p.name] = p; });

    const mangalHouses = [1,2,4,7,8,12];
    const marsH        = getHouseOfPlanet(b.Mars, lagna.rashi);
    const mangal       = mangalHouses.includes(marsH);

    const ra = b.Rahu.longitude, ke = b.Ketu.longitude;
    const others = planets.filter(p => !["Rahu","Ketu"].includes(p.name));
    function inArc(lon, s, e) {
      const ss = norm360(s), ee = norm360(e);
      return ss < ee ? lon > ss && lon < ee : lon > ss || lon < ee;
    }
    const kaalSarp = others.every(p => inArc(p.longitude, ra, ke))
                  || others.every(p => inArc(p.longitude, ke, ra));

    const sunH   = getHouseOfPlanet(b.Sun, lagna.rashi);
    const pitra  = b.Rahu.rashi === b.Sun.rashi
                || (sunH === 9 && (b.Rahu.rashi === b.Sun.rashi || b.Saturn.rashi === b.Sun.rashi));

    const satFromMoon = (b.Saturn.rashi - b.Moon.rashi + 12) % 12;
    const sadeSati    = [0,1,11].includes(satFromMoon);

    return [
      {name:"Mangal Dosha", present:mangal,   description:"Mars in 1/2/4/7/8/12 from Lagna — caution in marriage"},
      {name:"Kaal Sarp",    present:kaalSarp, description:"All planets between Rahu-Ketu — karmic journey, eventual rise"},
      {name:"Pitra Dosha",  present:pitra,    description:"Sun afflicted by Rahu/Saturn — ancestral karma, needs remedy"},
      {name:"Sade Sati",    present:sadeSati, description:"Saturn near natal Moon — period of testing and growth"},
    ];
  }

  // ── Navamsa (D9) — correct pada-based ────────────────────────────────────
  function calcNavamsa(planets) {
    // Navamsa start rashis for each element: Fire=0(Mesh), Earth=9(Makar), Air=6(Tula), Water=3(Kark)
    const navStart = [0, 9, 6, 3]; // indexed by rashi % 4 (fire/earth/air/water)
    const rashiElem = [0,3,2,1, 0,3,2,1, 0,3,2,1]; // each rashi's element index
    const padaSize  = 30 / 9; // 3°20' per navamsa pada

    return planets.map(p => {
      const birthRashi = Math.floor(p.longitude / 30);
      const degInRashi = p.longitude - birthRashi * 30;
      const padaNo     = Math.floor(degInRashi / padaSize); // 0-8
      const elem       = rashiElem[birthRashi];
      const navRashi   = (navStart[elem] + padaNo) % 12;
      return {
        name:      p.name,
        abbr:      p.abbr,
        rashi:     navRashi,
        rashiName: RASHI_NAMES[navRashi],
        degree:    parseFloat(((degInRashi % padaSize) / padaSize * 30).toFixed(2)),
        longitude: navRashi * 30 + (degInRashi % padaSize) / padaSize * 30,
      };
    });
  }

  // ── Predictions ───────────────────────────────────────────────────────────
  function generatePredictions(planets, lagna) {
    const b = {};
    planets.forEach(p => { b[p.name] = p; });
    const sunH = getHouseOfPlanet(b.Sun, lagna.rashi);
    const jupH = getHouseOfPlanet(b.Jupiter, lagna.rashi);
    const venH = getHouseOfPlanet(b.Venus, lagna.rashi);
    const moonH = getHouseOfPlanet(b.Moon, lagna.rashi);

    const careerMap = {
      1:"leadership, self-employment", 2:"finance, banking, speech",
      3:"media, writing, communication", 4:"real estate, education",
      5:"speculation, creative arts", 6:"service, medicine, law",
      7:"business partnerships, trade", 8:"research, occult, transformations",
      9:"law, religion, academics", 10:"government, management, profession",
      11:"networking, gains", 12:"foreign lands, spirituality",
    };
    const healthMap = {
      Mesh:"head, blood pressure", Vrishabh:"throat, thyroid", Mithun:"lungs, nervous system",
      Kark:"stomach, chest", Simha:"heart, spine, eyes", Kanya:"intestines, digestion",
      Tula:"kidneys, lower back", Vrishchik:"reproductive organs", Dhanu:"hips, thighs, liver",
      Makar:"knees, bones, joints", Kumbh:"ankles, circulation", Meen:"feet, lymphatic system",
    };
    const remMap = {
      Sun:"Offer water to Sun at sunrise; recite Aditya Hridayam on Sundays",
      Moon:"Wear pearl in silver; offer milk to Lord Shiva on Mondays",
      Mars:"Recite Hanuman Chalisa on Tuesdays; donate red lentils",
      Mercury:"Wear emerald in gold; donate green dal on Wednesdays",
      Jupiter:"Wear yellow sapphire; worship Brihaspati on Thursdays",
      Venus:"Wear diamond or white sapphire; worship Goddess Lakshmi on Fridays",
      Saturn:"Light sesame oil lamp on Saturdays; recite Shani Stotra",
      Rahu:"Donate blue items on Saturdays; worship Goddess Durga",
      Ketu:"Donate multi-colored items; worship Lord Ganesha",
    };

    const debilitated = planets.filter(p => p.status === "Debilitated");
    const remedies = debilitated.length
      ? debilitated.map(p => `${p.name} (Debilitated in ${p.rashiName}): ${remMap[p.name]}`)
      : ["No major planetary weaknesses. Continue regular worship and charitable activities."];

    return {
      career:`${lagna.rashiName} Lagna with Sun in ${sunH}th house (${careerMap[sunH]}) and Jupiter in ${jupH}th house. ${b.Jupiter.status === "Exalted" ? "Jupiter exalted brings exceptional growth." : b.Jupiter.status === "Own Sign" ? "Jupiter in own sign gives steady career progress." : "Consistent effort brings success."}`,
      marriage:`Venus in ${venH}th house (${b.Venus.rashiName}), ${b.Venus.status}. ${b.Saturn.rashi === b.Venus.rashi ? "Saturn conjunct Venus may delay marriage — patience advised after age 28." : "Marriage prospects are positive."} Moon in ${b.Moon.rashiName} in ${moonH}th house indicates ${moonH <= 4 ? "family-oriented" : moonH <= 8 ? "emotionally expressive" : "spiritually inclined"} nature.`,
      health:`${lagna.rashiName} Lagna: Watch your ${healthMap[lagna.rashiName] || "overall health"}. ${b.Saturn.status === "Exalted" || b.Saturn.status === "Own Sign" ? "Strong Saturn supports longevity." : "Regular health checkups recommended."}`,
      remedies,
    };
  }

  // ── Utilities ─────────────────────────────────────────────────────────────
  function jdToDateStr(jd) {
    const z = Math.floor(jd + 0.5), f = jd + 0.5 - z;
    let A = z;
    if (z >= 2299161) { const a = Math.floor((z-1867216.25)/36524.25); A = z+1+a-Math.floor(a/4); }
    const B = A+1524, C = Math.floor((B-122.1)/365.25), D = Math.floor(365.25*C), E = Math.floor((B-D)/30.6001);
    const day = B-D-Math.floor(30.6001*E), month = E<14?E-1:E-13, year = month>2?C-4716:C-4715;
    return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  }

  function addYears(date, years) {
    const d = new Date(date instanceof Date ? date.getTime() : new Date(date).getTime());
    d.setTime(d.getTime() + years * 365.25 * 86400000);
    return d;
  }

  function fmtDate(d) {
    return (d instanceof Date ? d : new Date(d)).toISOString().split("T")[0];
  }

  // ── Main Export ───────────────────────────────────────────────────────────
  function calculate(birthData) {
    const jd       = jdFromBirthData(birthData);
    const ayanamsa = lahiriAyanamsa(jd);
    const planets  = getAllPlanets(jd);
    const lagna    = calcLagna(jd, Number(birthData.lat), Number(birthData.lng));
    const houses   = calcHouses(lagna);

    planets.forEach(p => { p.house = getHouseOfPlanet(p, lagna.rashi); });

    const moon       = planets.find(p => p.name === "Moon");
    const dasha      = calcDasha(moon.longitude, jd);
    const antardashas = calcAntardashas(dasha.current);
    const yogas      = detectYogas(planets, lagna);
    const doshas     = detectDoshas(planets, lagna);
    const navamsa    = calcNavamsa(planets);
    const predictions = generatePredictions(planets, lagna);

    return {birthData, jd, ayanamsa, lagna, planets, houses, dasha, antardashas, yogas, doshas, navamsa, predictions};
  }

  window.KundaliEngine = { calculate };
})();
