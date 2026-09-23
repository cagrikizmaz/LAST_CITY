import { resourceNames, type Resource } from "./game";

// Product artwork is independent of the producing site and stable across platforms.
const path = (d: string, fill = "none") => `<path d="${d}" fill="${fill}"/>`;
const rect = (x: number, y: number, w: number, h: number, fill: string, r = 3) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
const circle = (x: number, y: number, r: number, fill: string) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const metal = "#a6bec9", wood = "#b98148", gold = "#edc36a", green = "#79b879";
const rock = (color: string, detail: string) => path("M10 43 17 23 35 15 51 29 54 46 33 53Z", color) + path(detail);
const sack = (color: string, detail: string) => path("M23 13 41 13 38 23Q57 50 44 53H20Q7 50 26 23Z", color) + path("M25 23H39") + detail;
const jar = (color: string, detail: string) => rect(20, 12, 24, 7, wood) + rect(17, 20, 30, 34, color, 7) + detail;
const bottle = (color: string, detail = "") => rect(26, 9, 12, 8, metal) + path("M26 17V26L21 31V53H43V31L38 26V17Z", color) + detail;
const tool = (head: string) => path("M19 53 39 15", wood) + path("M23 54 43 17", wood) + head;
const ingot = (color: string) => path("M11 38 20 22H44L54 38 44 47H20Z", color) + path("M11 38H54M20 22 24 38M44 22 40 38");
const sheet = (color: string, detail: string) => path("M16 12H41L50 22V53H16Z", color) + path("M41 12V23H50") + detail;
const box = (color: string, detail: string) => rect(14, 18, 36, 34, color) + detail;
const leaf = path("M31 25Q24 7 45 10Q46 24 31 25", green);
const grain = (color: string) => path("M31 52V16M31 25 21 17M31 34 20 26M31 43 21 35M32 25 42 17M32 34 43 26M32 43 42 35", color);
const wheel = (x: number, y: number, r = 6) => circle(x, y, r, "#455763") + circle(x, y, 2, metal);
const device = (color: string, detail: string) => rect(13, 17, 38, 34, color, 5) + detail;
const art: Record<string, string> = {
  "Altın Cevheri": rock("#8f8978", "M17 23 31 33 51 29M31 33 33 53") + path("M21 30 27 24 32 31 26 36Z", gold) + path("M35 41 42 35 47 42 39 46Z", gold),
  "Altın Külçesi": ingot("#eac05d") + circle(32, 31, 4, "#fff0a7"),
  "Gümüş": ingot("#dce4ee") + path("M28 27 36 34M36 27 28 34"),
  "Kaymak": path("M12 34H52L45 53H19Z", "#a6c7c3") + path("M15 34Q18 25 27 27Q28 15 35 23Q47 22 49 34Z", "#f5e4b4"),
  "Koyun sütü": bottle("#e2ddd0", circle(28, 36, 5, "#fff5e2") + circle(35, 36, 5, "#fff5e2") + circle(32, 43, 4, "#78858b")),
  "Koyun peyniri": rect(13, 30, 39, 20, "#f4ead1", 7) + `<ellipse cx="32" cy="30" rx="19" ry="9" fill="#fff4db"/>` + path("M23 30Q32 23 41 30M22 42H26M37 44H42"),
  "Odun": path("M14 22 40 12 53 35 27 48Z", wood) + path("M18 25 42 16M22 31 45 22") + `<ellipse cx="21" cy="36" rx="12" ry="15" fill="#e8bd7a"/>` + `<ellipse cx="21" cy="36" rx="6" ry="8" fill="none"/>`,
  "Çubuk": path("M14 52 38 12 42 14 18 54Z", wood) + path("M26 52 49 21 52 24 30 54Z", "#d9aa69") + path("M29 29 23 17M39 37 51 35"),
  "Yumurta": `<path d="M32 12C20 12 10 36 16 46C22 57 44 55 49 44C54 32 41 12 32 12Z" fill="#f5dfb0"/>` + path("M23 30Q20 36 22 41"),
  "Meyve": path("M32 24C9 11 7 45 23 52Q32 57 40 51C59 43 52 10 32 24Z", "#e57362") + leaf,
  "Taş": rock("#a5b6b9", "M17 23 31 33 51 29M31 33 33 53"),
  "Kömür": rock("#455360", "M17 23 26 39 10 43M26 39 41 34 54 46M35 15 41 34"),
  "Demir": rock("#7e94a3", "M21 30 27 24 32 31M35 41 44 35M20 44 25 40"),
  "Bakır": rock("#d58a60", "M20 32 29 23 37 32M27 45 38 39 44 43"),
  "Kil": path("M12 44Q8 35 23 33Q15 20 33 19Q49 20 45 34Q58 40 49 49H18Z", "#bf8068"),
  "Kum": path("M9 49 24 31 33 23 45 39 56 49Z", "#e9ce8b") + path("M20 46H23M30 39H32M40 46H44"),
  "Yem": sack("#bda16b", grain(gold)),
  "Buğday": grain(gold) + path("M20 50 44 50"),
  "Un": sack("#efe0b8", path("M26 34H38M26 40H38M26 46H38")),
  "Ekmek": path("M10 39Q10 20 32 20Q54 20 54 39V47H10Z", "#d69a4d") + path("M21 27 17 36M33 26 29 35M45 28 41 37"),
  "Süt": bottle("#f4efdc", path("M22 36H42M22 45H42")),
  "Peynir": path("M12 34 38 18 53 34V51H12Z", gold) + path("M12 34H53") + circle(24, 43, 3, "#cc9145") + circle(42, 40, 2, "#cc9145"),
  "Yün": circle(22, 34, 11, "#f3e7cc") + circle(33, 24, 11, "#f3e7cc") + circle(44, 34, 11, "#f3e7cc") + circle(33, 43, 11, "#f3e7cc"),
  "Pamuk": path("M32 54V29M32 46 19 39M32 44 45 37", green) + circle(22, 26, 10, "#fff6e8") + circle(40, 26, 10, "#fff6e8") + circle(31, 18, 10, "#fff6e8"),
  "İplik": rect(23, 16, 18, 34, "#d58c82") + path("M18 15H46M18 51H46M23 24 41 19M23 33 41 28M23 42 41 37M23 49 41 44"),
  "Kumaş": path("M13 17H46V46Q39 56 31 46H13Z", "#8fb4da") + path("M21 18V45M29 18V45M14 27H45M14 36H45"),
  "Deri": path("M19 12 31 18 45 12 51 24 43 31 51 49 37 52 28 46 15 53 11 39 19 31 12 22Z", "#b57d58"),
  "Halat": path("M22 49C3 26 35 9 47 26C60 47 22 56 21 35C20 20 41 24 39 37Q35 45 31 37M45 44 52 53", "none"),
  "Tuğla": path("M10 28 39 18 54 28V45L25 55 10 45Z", "#cc7c65") + path("M10 28 25 38 54 28M25 38V55M19 27 39 21"),
  "Cam": path("M19 10 48 17 43 53 14 46Z", "#a5e0e3") + path("M23 34 37 20M23 43 40 25"),
  "Çelik": ingot("#d2e1e4") + path("M26 29H38"),
  "Hamdemir": ingot("#747e90") + path("M21 42H42"),
  "Çivi": path("M18 18 25 18 42 51ZM13 19 29 13M40 15 45 18 26 51ZM36 12 50 21", metal),
  "Tahta": path("M13 20H51V34H13ZM13 38H51V51H13Z", wood) + path("M18 26H44M24 44H47"),
  "Kereste": path("M11 37 40 13 53 23 24 48ZM11 37V49L24 58V48M24 58 53 33V23", "#cf9a5b") + path("M23 36 43 20M32 45 47 32"),
  "Kâğıt": sheet("#f4e9cc", path("M23 30H42M23 37H42M23 44H36")),
  "Kömür Briketi": rect(12, 30, 19, 21, "#4b5360") + rect(34, 30, 19, 21, "#4b5360") + rect(23, 12, 19, 20, "#606a75"),
  "Tuz": jar("#ecf3ec", path("M24 43 29 34 35 43 40 37M25 49H40")),
  "Şeker": box("#edc9d6", rect(22, 33, 12, 12, "#fff4eb") + rect(31, 28, 11, 11, "#fff4eb")),
  "Bal": jar("#edb94f", path("M25 31 32 27 39 31V40L32 44 25 40Z")),
  "Patates": `<ellipse cx="25" cy="37" rx="15" ry="13" fill="#c9a064"/><ellipse cx="42" cy="27" rx="12" ry="15" fill="#d7b77f"/>` + path("M18 35H20M29 41H31M39 23H41M44 32H46"),
  "Havuç": path("M15 54 27 22Q43 16 45 33Z", "#ed9b4f") + path("M37 22 35 10M41 24 50 13M30 32 36 36M24 43 29 46", green),
  "Domates": circle(32, 36, 20, "#e87660") + path("M32 12 35 24 45 21 38 29 28 29 21 21 30 24Z", green),
  "Mısır": `<ellipse cx="32" cy="29" rx="11" ry="20" fill="#edc451"/>` + path("M26 18H38M23 26H41M23 34H41M32 11V47M32 53Q10 46 13 25Q27 31 32 53Q52 46 51 25Q38 31 32 53", green),
  "Pirinç": sack("#a4bd90", path("M24 35 27 39M34 32 37 36M31 43 34 47M40 41 42 45")),
  "Zeytin": leaf + circle(23, 37, 10, "#78985e") + circle(41, 43, 10, "#536e4d"),
  "Zeytinyağı": bottle("#aabd64", leaf),
  "Üzüm": [circle(22, 28, 8, "#aa87bd"), circle(40, 28, 8, "#aa87bd"), circle(31, 38, 9, "#9672af"), circle(31, 50, 6, "#9672af"), leaf].join(""),
  "Meyve Suyu": box("#efa873", path("M20 18 26 11H40L50 18M39 27 45 8") + circle(31, 38, 9, "#edc363")),
  "Reçel": jar("#be7485", circle(29, 36, 6, "#eaaaad") + circle(36, 42, 5, "#eaaaad")),
  "Tereyağı": path("M9 46 23 34H49L56 50H14Z", "#eceddf") + rect(20, 25, 27, 20, "#efd982"),
  "Yoğurt": path("M17 22H47L43 52H21Z", "#ecf1ea") + rect(15, 17, 34, 6, "#94b9d3") + path("M26 35Q32 27 38 35Q37 43 26 41Z", "#94b9d3"),
  "Et": path("M16 25Q35 10 48 24Q60 44 38 52Q11 59 10 40Z", "#d78783") + path("M21 30Q35 21 41 31Q47 45 27 45Z", "#efc0b1") + circle(31, 35, 5, "#f7e4c7"),
  "Balık": path("M12 34Q30 10 49 32L58 22V46L48 37Q29 57 12 34Z", "#8ec8cc") + circle(23, 32, 2, "#354854") + path("M33 24Q40 34 33 44"),
  "Konserve": rect(17, 17, 30, 36, metal, 7) + rect(17, 28, 30, 16, "#d68b65") + path("M23 22H41M24 48H40"),
  "Kurutulmuş Gıda": sack("#bd866c", circle(26, 36, 4, gold) + circle(37, 40, 4, "#b76554") + circle(28, 46, 3, gold)),
  "Sabun": rect(12, 28, 37, 23, "#a5d7c8", 9) + circle(44, 17, 6, "#d3eddf") + circle(24, 16, 3, "#d3eddf"),
  "Mum": rect(23, 27, 18, 26, "#f1dba3") + path("M32 26C18 18 35 7 33 9C45 20 36 25 32 26Z", "#efa74f"),
  "Seramik": path("M23 12H41V19Q50 29 47 44Q46 54 32 54Q18 54 17 44Q14 29 23 19Z", "#a7c8ce") + path("M18 34H46M20 43H44"),
  "Kiremit": path("M14 47 23 16Q31 9 39 16L51 47Q40 39 33 49Q24 40 14 47Z", "#c9785c") + path("M32 18 27 42M41 24 45 40"),
  "Çimento": sack("#b8c1b4", rect(23, 32, 18, 13, "#839487")),
  "Beton": path("M12 24 41 17 53 27V48L25 55 12 45Z", "#9fa9a6") + path("M12 24 25 34 53 27M25 34V55") + circle(23, 25, 2, "#626f70") + circle(39, 24, 2, "#626f70"),
  "Boru": path("M13 50V30Q13 18 26 18H49V30H29Q25 30 25 35V50Z", metal) + rect(10, 45, 18, 8, metal) + rect(45, 14, 8, 20, metal),
  "Tel": path("M13 48C50 58 56 16 31 15C8 14 9 42 30 42C47 42 48 24 31 23C17 22 20 35 31 34M31 15 51 10"),
  "Kablo": path("M13 17V37C13 57 46 56 46 38V25", "none") + rect(8, 10, 10, 12, "#d6ab68") + rect(41, 16, 10, 12, "#80b7c1") + path("M10 10V6M16 10V6M43 16V11M49 16V11"),
  "Vida": path("M18 23 28 16 48 48 43 53Z", metal) + path("M14 22 28 12 33 19 18 29ZM27 30 35 26M31 37 39 33M35 44 44 39M18 20 26 17"),
  "Dişli": path("M26 10H38L40 18 47 16 54 27 48 33 52 41 43 50 35 46 29 54 18 49 19 40 10 36 13 24 22 23Z", metal) + circle(32, 32, 10, "#304653"),
  "Alet Takımı": rect(10, 27, 44, 26, "#cc8664") + path("M22 27V16H42V27M10 37H54") + rect(28, 34, 8, 10, gold),
  "Balta": tool(path("M29 15 47 10 54 28 36 25Z", metal)),
  "Kazma": tool(path("M16 24Q30 5 52 22L50 27Q32 16 18 29Z", metal)),
  "Kürek": tool(path("M32 25 48 32Q45 49 32 51Q23 40 32 25Z", metal)) + path("M39 15 44 7 50 11 45 20"),
  "Çapa": tool(path("M19 15 43 16 50 31 40 35 34 24 17 23Z", metal)),
  "El Arabası": path("M11 23H45L39 40H20Z", "#97b7ab") + path("M39 40 48 18H56M22 40 16 51") + wheel(37, 49),
  "Mobilya": rect(12, 19, 40, 29, wood) + path("M12 32H52M32 19V48M17 48V55M47 48V55") + circle(25, 39, 2, gold) + circle(39, 39, 2, gold),
  "Masa": path("M10 23 40 15 55 25 24 34Z", wood) + path("M13 26V49M25 34V56M51 28V49M39 32V46"),
  "Sandalye": rect(21, 10, 23, 21, wood) + path("M21 31V41M44 31V41M17 41H49V46H17ZM20 46V56M45 46V56", wood),
  "Dolap": rect(15, 9, 34, 44, wood) + path("M32 9V53M20 53V57M44 53V57M27 28V35M37 28V35"),
  "Yatak": path("M10 29V53M54 29V53M10 44H54") + rect(12, 29, 40, 15, "#8da9d0") + rect(15, 24, 14, 10, "#f1e7d0"),
  "Battaniye": rect(13, 14, 37, 37, "#b197c2") + path("M14 23H49M14 42H49M20 14V51M42 14V51M19 51V56M27 51V56M35 51V56M43 51V56"),
  "Giysi": path("M21 13 28 17H36L43 13 56 26 46 35 41 30V54H23V30L18 35 8 26Z", "#88afb9"),
  "Bot": path("M22 12H42V37L52 43V53H13V42L22 36Z", "#ad825f") + path("M28 22H38M28 28H38M28 34H38M13 48H51"),
  "Eldiven": path("M19 49 13 32Q12 25 18 27L23 33V15Q25 10 29 15V28 11Q32 6 35 12V27 14Q39 9 42 15V29 21Q47 17 49 24V41L43 52H22Z", "#cda765"),
  "Kask": path("M12 39Q10 17 32 14Q54 17 52 39L43 52H35V38H12Z", "#93b2cb") + path("M35 38H52"),
  "Baret": path("M12 39Q13 18 27 17V12H37V17Q51 19 52 39Z", gold) + rect(8, 39, 48, 8, gold) + path("M27 18V33M37 18V33"),
  "İlaç": bottle("#dfe7df", rect(28, 32, 8, 16, "#da827b") + rect(24, 36, 16, 8, "#da827b")),
  "Bandaj": path("M13 40 40 13Q49 8 55 20L26 52Q16 58 13 40Z", "#e4cfad") + path("M26 29 38 41M21 34 33 46M31 24 43 36") + circle(36, 28, 1, wood),
  "Gübre": sack("#a58c74", leaf),
  "Tohum": sack("#d3b985", circle(26, 38, 3, "#75594e") + circle(36, 34, 3, "#75594e") + circle(36, 45, 3, "#75594e")),
  "Fidan": path("M32 48V18M32 34Q11 34 13 18Q30 16 32 34M32 26Q33 9 51 12Q52 29 32 26", green) + path("M19 45H45L41 56H23Z", wood),
  "Kauçuk": circle(32, 33, 22, "#4b6065") + circle(32, 33, 12, "#c3d6c2") + path("M19 17 23 22M43 18 40 22M17 44 22 41M44 46 41 42"),
  "Plastik": path("M11 29 33 18 52 27 30 39Z", "#b0d5da") + path("M11 37 30 47 52 35M11 45 30 55 52 43"),
  "Petrol": rect(17, 12, 30, 43, "#657681") + path("M17 21H47M17 46H47M32 27Q21 41 32 41Q43 41 32 27Z", "#354652"),
  "Benzin": path("M18 16H43L49 25V53H15V24Z", "#d38b68") + path("M25 16V10H40V16M22 27 42 46M42 27 22 46"),
  "Pil": rect(23, 14, 18, 40, "#a3c08e") + rect(27, 9, 10, 5, metal) + path("M27 25H37M32 20V30M27 44H37"),
  "Akü": box("#779ca6", path("M20 18V11H26V18M39 18V11H45V18M20 30H29M24 26V35M38 30H45")),
  "Ampul": path("M25 43C25 35 14 33 17 22C20 7 44 7 47 22C50 33 39 35 39 43Z", "#f0d57f") + rect(25, 43, 14, 11, metal) + path("M29 43 26 28H38L35 43M26 49H38"),
  "Devre": device("#73a68e", rect(25, 27, 14, 14, "#455e65") + path("M18 24H26V27M39 32H47M32 41V47M19 43V35H25")),
  "Sensör": device("#a9bfcb", circle(32, 33, 11, "#4e707e") + circle(32, 33, 5, "#9dd9d4") + path("M24 11Q32 5 40 11")),
  "Motor": rect(17, 22, 31, 26, "#91a9b4") + path("M10 29H17V41H10M48 29H56V40H48M23 48V54M42 48V54M24 27V43M32 27V43M40 27V43"),
  "Pompa": circle(31, 35, 16, "#83b4ba") + circle(31, 35, 6, metal) + path("M29 19V10H49V19H38M15 32H7V42H17M20 49V55H45V49", metal),
  "Jeneratör": rect(9, 16, 46, 37, metal) + rect(15, 23, 34, 23, "#cd9b68") + path("M20 29H30M20 35H30M20 41H30") + circle(41, 34, 6, "#5c737a"),
  "Güneş Paneli": path("M17 14H53L45 44H9Z", "#729ac7") + path("M15 24H50M12 34H47M29 14 21 44M41 14 33 44M27 44V54M19 54H37"),
  "Türbin": circle(32, 27, 5, metal) + path("M32 32V56M28 25 12 13 17 8 31 21M36 25 52 17 55 23 37 30M31 32 21 47 15 42 27 28", "#b0cdd4"),
  "Filtre": path("M11 14H53L38 35V48L26 54V35Z", metal) + path("M17 22H47M24 29H40M24 15V22M33 15V29M41 15V22"),
  "Arıtılmış Su": bottle("#a0dce0", path("M32 32Q21 47 32 47Q43 47 32 32Z", "#e4f5ed")),
  "Radyo": device("#c7a47c", circle(26, 35, 9, "#617b80") + rect(40, 26, 5, 5, gold) + path("M40 17 49 7M39 38H45M39 44H45")),
  "Bilgisayar": rect(9, 12, 46, 32, metal) + rect(14, 17, 36, 22, "#77b7c2") + path("M32 44V51M22 52H42M18 23 25 28 18 33M30 33H40"),
  "Robot Kol": rect(14, 48, 37, 8, metal) + path("M28 48 18 31 36 15 43 22 28 35 38 48Z", gold) + circle(22, 32, 5, metal) + circle(39, 19, 5, metal) + path("M43 20 53 28 48 36M53 28 58 22"),
  "Drone": rect(24, 25, 16, 15, metal) + path("M24 26 15 17M40 26 49 17M24 39 15 48M40 39 49 48") + [circle(14, 16, 8, "#9fc3c7"), circle(50, 16, 8, "#9fc3c7"), circle(14, 49, 8, "#9fc3c7"), circle(50, 49, 8, "#9fc3c7")].join(""),
  "Uydu Parçası": path("M21 20Q18 43 43 43Z", metal) + path("M30 32 46 15M26 44 22 53H44M46 15 52 12M47 9Q57 10 56 20") + circle(45, 17, 3, gold),
  "Enerji Hücresi": rect(19, 13, 26, 40, "#79c5bb") + path("M25 8H39V13M25 53V57H39M34 20 25 34H34L29 47 40 30H32Z", "#e8dc8b"),
  "Şehir Çekirdeği": path("M32 7 53 20V44L32 57 11 44V20Z", "#8fa8cf") + path("M32 17 44 25V39L32 47 20 39V25Z", "#a2e3d6") + path("M32 7V17M53 20 44 25M53 44 44 39M32 57V47M11 44 20 39M11 20 20 25"),
  "Sepet": path("M12 29H52L46 53H18Z", wood) + path("M20 29Q20 6 32 10Q44 6 44 29M16 37H49M18 45H47M24 29V52M33 29V52M42 29V52"),
  "Av yayı": path("M16 11Q62 31 16 54L29 32Z", wood) + path("M16 11 29 32 16 54M13 32H52M46 27 53 32 46 37"),
  "Süt kovası": path("M17 25H47L43 54H21Z", metal) + path("M19 25Q17 7 32 8Q47 7 45 25M23 31V47M41 31V47"),
  "Kırkım makası": circle(18, 46, 8, metal) + circle(44, 46, 8, metal) + path("M23 39 43 10 36 35 39 40M39 39 19 10 26 35 23 40", metal) + circle(31, 32, 3, gold),
};

export const productArtwork = art;
const images = new Map<string, string>();
export function ProductIcon({ resource, size = 24 }: { resource: Resource; size?: number }) {
  const name = resourceNames[resource];
  let src = images.get(name);
  if (!src) {
    const drawing = art[name] ?? box(metal, path("M22 28H42M22 36H42M22 44H35"));
    src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g stroke="#34464b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${drawing}</g></svg>`)}`;
    images.set(name, src);
  }
  return <img className="product-icon" src={src} width={size} height={size} alt="" aria-hidden="true" draggable={false} />;
}
