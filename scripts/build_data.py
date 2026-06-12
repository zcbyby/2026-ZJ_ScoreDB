import xlrd, json, sys, os, re
from collections import defaultdict

YEARS = {'231': '2023', '241': '2024', '251': '2025'}

# ── Province mapping (first 2 digits of school code) ────
CODE_PROVINCE = {
    '00': '浙江', '01': '浙江', '02': '浙江',
    '11': '北京',
    '12': '天津',
    '13': '河北',
    '14': '山西',
    '15': '内蒙古',
    '21': '辽宁',
    '22': '吉林',
    '23': '黑龙江',
    '31': '上海',
    '32': '江苏', '33': '江苏',
    '34': '安徽',
    '35': '福建',
    '36': '江西', '38': '江西',
    '37': '山东', '39': '山东',
    '40': '湖北', '41': '湖北',
    '42': '河南',
    '43': '湖南',
    '44': '广东',
    '45': '广西',
    '46': '海南',
    '50': '重庆',
    '51': '四川',
    '52': '贵州',
    '53': '云南',
    '54': '西藏',
    '61': '陕西',
    '62': '甘肃',
    '63': '青海',
    '64': '宁夏',
    '65': '新疆',
    '81': '香港',
    '90': '军事/特殊',
}

# ── Province capitals ───────────────────────────────────
PROVINCE_CAPITAL = {
    '北京': '北京', '天津': '天津', '河北': '石家庄', '山西': '太原', '内蒙古': '呼和浩特',
    '辽宁': '沈阳', '吉林': '长春', '黑龙江': '哈尔滨',
    '上海': '上海', '江苏': '南京', '浙江': '杭州', '安徽': '合肥', '福建': '福州',
    '江西': '南昌', '山东': '济南',
    '河南': '郑州', '湖北': '武汉', '湖南': '长沙', '广东': '广州', '广西': '南宁', '海南': '海口',
    '重庆': '重庆', '四川': '成都', '贵州': '贵阳', '云南': '昆明', '西藏': '拉萨',
    '陕西': '西安', '甘肃': '兰州', '青海': '西宁', '宁夏': '银川', '新疆': '乌鲁木齐',
    '香港': '香港', '澳门': '澳门', '军事/特殊': '北京',
}

# ── Known city names (prefecture-level and above) ───────
CITY_NAMES = {
    '北京', '天津', '石家庄', '唐山', '秦皇岛', '邯郸', '保定', '张家口', '承德', '沧州',
    '廊坊', '衡水', '太原', '大同', '阳泉', '长治', '晋城', '朔州', '晋中', '运城', '忻州',
    '临汾', '吕梁', '呼和浩特', '包头', '乌海', '赤峰', '通辽', '鄂尔多斯', '呼伦贝尔',
    '沈阳', '大连', '鞍山', '抚顺', '本溪', '丹东', '锦州', '营口', '阜新', '辽阳', '盘锦',
    '铁岭', '朝阳', '葫芦岛', '长春', '吉林', '四平', '辽源', '通化', '白山', '松原', '白城',
    '哈尔滨', '齐齐哈尔', '鸡西', '鹤岗', '双鸭山', '大庆', '伊春', '佳木斯', '七台河',
    '牡丹江', '黑河', '绥化', '上海', '南京', '无锡', '徐州', '常州', '苏州', '南通', '连云港',
    '淮安', '盐城', '扬州', '镇江', '泰州', '宿迁', '杭州', '宁波', '温州', '嘉兴', '湖州',
    '绍兴', '金华', '衢州', '舟山', '台州', '丽水', '合肥', '芜湖', '蚌埠', '淮南', '马鞍山',
    '淮北', '铜陵', '安庆', '黄山', '滁州', '阜阳', '宿州', '六安', '亳州', '池州', '宣城',
    '福州', '厦门', '莆田', '三明', '泉州', '漳州', '南平', '龙岩', '宁德', '南昌', '景德镇',
    '萍乡', '九江', '新余', '鹰潭', '赣州', '吉安', '宜春', '抚州', '上饶', '济南', '青岛',
    '淄博', '枣庄', '东营', '烟台', '潍坊', '济宁', '泰安', '威海', '日照', '临沂', '德州',
    '聊城', '滨州', '菏泽', '郑州', '开封', '洛阳', '平顶山', '安阳', '鹤壁', '新乡', '焦作',
    '濮阳', '许昌', '漯河', '三门峡', '南阳', '商丘', '信阳', '周口', '驻马店', '武汉', '黄石',
    '十堰', '宜昌', '襄阳', '鄂州', '荆门', '孝感', '荆州', '黄冈', '咸宁', '随州', '恩施',
    '长沙', '株洲', '湘潭', '衡阳', '邵阳', '岳阳', '常德', '张家界', '益阳', '郴州', '永州',
    '怀化', '娄底', '湘西', '广州', '韶关', '深圳', '珠海', '汕头', '佛山', '江门', '湛江',
    '茂名', '肇庆', '惠州', '梅州', '汕尾', '河源', '阳江', '清远', '东莞', '中山', '潮州',
    '揭阳', '云浮', '南宁', '柳州', '桂林', '梧州', '北海', '防城港', '钦州', '贵港', '玉林',
    '百色', '贺州', '河池', '来宾', '崇左', '海口', '三亚', '儋州', '重庆', '成都', '自贡',
    '攀枝花', '泸州', '德阳', '绵阳', '广元', '遂宁', '内江', '乐山', '南充', '眉山', '宜宾',
    '广安', '达州', '雅安', '巴中', '资阳', '贵阳', '六盘水', '遵义', '安顺', '毕节', '铜仁',
    '昆明', '曲靖', '玉溪', '保山', '昭通', '丽江', '普洱', '临沧', '大理', '楚雄', '红河',
    '文山', '西双版纳', '拉萨', '日喀则', '昌都', '林芝', '山南', '那曲', '西安', '铜川',
    '宝鸡', '咸阳', '渭南', '延安', '汉中', '榆林', '安康', '商洛', '兰州', '嘉峪关', '金昌',
    '白银', '天水', '武威', '张掖', '平凉', '酒泉', '庆阳', '定西', '陇南', '西宁', '海东',
    '银川', '石嘴山', '吴忠', '固原', '中卫', '乌鲁木齐', '克拉玛依', '吐鲁番', '哈密',
    '昌吉', '伊犁', '塔城', '阿勒泰', '喀什', '和田', '香港', '澳门',
}

# ── Manual override for schools whose names don't reveal city ──
MANUAL_CITY = {
    '中国美术学院': ('浙江', '杭州'),
    '中国计量大学': ('浙江', '杭州'),
    '中国科学技术大学': ('安徽', '合肥'),
    '中国海洋大学': ('山东', '青岛'),
    '中国人民警察大学': ('河北', '廊坊'),
    '华东师范大学': ('上海', '上海'),
    '华中科技大学': ('湖北', '武汉'),
    '华南理工大学': ('广东', '广州'),
    '西北工业大学': ('陕西', '西安'),
    '西南大学': ('重庆', '重庆'),
    '西南交通大学': ('四川', '成都'),
    '东北大学': ('辽宁', '沈阳'),
    '东北大学秦皇岛分校': ('河北', '秦皇岛'),
    '中南大学': ('湖南', '长沙'),
    '浙江师范大学': ('浙江', '金华'),
    '浙江海洋大学': ('浙江', '舟山'),
    '浙大城市学院': ('浙江', '杭州'),
    '浙大宁波理工学院': ('浙江', '宁波'),
    '海军军医大学': ('上海', '上海'),
    '北京师范大学-香港浸会大学联合国际学院': ('广东', '珠海'),
    '香港珠海学院': ('香港', '香港'),
    '宁波诺丁汉大学': ('浙江', '宁波'),
    '西交利物浦大学': ('江苏', '苏州'),
    '温州肯恩大学': ('浙江', '温州'),
    '南方科技大学': ('广东', '深圳'),
    '南方医科大学': ('广东', '广州'),
    '哈尔滨工业大学(深圳)': ('广东', '深圳'),
    '哈尔滨工业大学(威海)': ('山东', '威海'),
    '遵义医科大学': ('贵州', '遵义'),
    '蚌埠医科大学': ('安徽', '蚌埠'),
    '华侨大学': ('福建', '泉州'),
    '暨南大学': ('广东', '广州'),
    '外交学院': ('北京', '北京'),
    '国际关系学院': ('北京', '北京'),
    '安徽大学': ('安徽', '合肥'),
    '安徽医科大学': ('安徽', '合肥'),
    '安徽工业大学': ('安徽', '马鞍山'),
    '安徽理工大学': ('安徽', '淮南'),
    '安徽师范大学': ('安徽', '芜湖'),
    '安徽农业大学': ('安徽', '合肥'),
    '安徽财经大学': ('安徽', '蚌埠'),
    '安徽中医药大学': ('安徽', '合肥'),
    '安徽建筑大学': ('安徽', '合肥'),
    '安徽工程大学': ('安徽', '芜湖'),
    '福建师范大学': ('福建', '福州'),
    '福建农林大学': ('福建', '福州'),
    '福建医科大学': ('福建', '福州'),
    '福建中医药大学': ('福建', '福州'),
    '福建理工大学': ('福建', '福州'),
    '福建江夏学院': ('福建', '福州'),
    '江西师范大学': ('江西', '南昌'),
    '江西财经大学': ('江西', '南昌'),
    '江西理工大学': ('江西', '赣州'),
    '江西农业大学': ('江西', '南昌'),
    '江西中医药大学': ('江西', '南昌'),
    '江西科技师范大学': ('江西', '南昌'),
    '江西工程学院': ('江西', '新余'),
    '江西应用科技学院': ('江西', '南昌'),
    '山东师范大学': ('山东', '济南'),
    '山东科技大学': ('山东', '青岛'),
    '山东农业大学': ('山东', '泰安'),
    '山东财经大学': ('山东', '济南'),
    '山东中医药大学': ('山东', '济南'),
    '山东建筑大学': ('山东', '济南'),
    '山东第一医科大学': ('山东', '济南'),
    '山东政法学院': ('山东', '济南'),
    '山东工艺美术学院': ('山东', '济南'),
    '山东石油化工学院': ('山东', '东营'),
    '河南师范大学': ('河南', '新乡'),
    '河南科技大学': ('河南', '洛阳'),
    '河南理工大学': ('河南', '焦作'),
    '河南工业大学': ('河南', '郑州'),
    '河南农业大学': ('河南', '郑州'),
    '河南财经政法大学': ('河南', '郑州'),
    '河南中医药大学': ('河南', '郑州'),
    '湖北师范大学': ('湖北', '黄石'),
    '湖北工业大学': ('湖北', '武汉'),
    '湖北中医药大学': ('湖北', '武汉'),
    '湖北汽车工业学院': ('湖北', '十堰'),
    '湖北工程学院': ('湖北', '孝感'),
    '湖南师范大学': ('湖南', '长沙'),
    '湖南科技大学': ('湖南', '湘潭'),
    '湖南工业大学': ('湖南', '株洲'),
    '湖南农业大学': ('湖南', '长沙'),
    '湖南中医药大学': ('湖南', '长沙'),
    '湖南工商大学': ('湖南', '长沙'),
    '湖南理工学院': ('湖南', '岳阳'),
    '湖南工程学院': ('湖南', '湘潭'),
    '湖南城市学院': ('湖南', '益阳'),
    '湖南文理学院': ('湖南', '常德'),
    '湖南科技学院': ('湖南', '永州'),
    '湖南人文科技学院': ('湖南', '娄底'),
    '湖南警察学院': ('湖南', '长沙'),
    '湖南女子学院': ('湖南', '长沙'),
    '广东工业大学': ('广东', '广州'),
    '广东外语外贸大学': ('广东', '广州'),
    '广东财经大学': ('广东', '广州'),
    '广东海洋大学': ('广东', '湛江'),
    '广东药科大学': ('广东', '广州'),
    '广东金融学院': ('广东', '广州'),
    '广东技术师范大学': ('广东', '广州'),
    '广东石油化工学院': ('广东', '茂名'),
    '广东第二师范学院': ('广东', '广州'),
    '广西师范大学': ('广西', '桂林'),
    '广西医科大学': ('广西', '南宁'),
    '广西科技大学': ('广西', '柳州'),
    '广西中医药大学': ('广西', '南宁'),
    '广西财经学院': ('广西', '南宁'),
    '广西民族大学': ('广西', '南宁'),
}

# ── Regional prefix → city mapping ─────────────────────
REGIONAL_CITY = {
    '华东': '上海',
    '华北': '北京',
    '华中': '武汉',
    '华南': '广州',
    '西北': '西安',
    '西南': '成都',
    '东北': '沈阳',
    '中南': '武汉',
}

# Suffixes to strip when looking for city in name
SCHOOL_SUFFIXES = [
    '职业技术大学', '职业技术学院', '高等专科学校', '职业学院',
    '师范大学', '工业大学', '科技大学', '理工大学', '农业大学',
    '财经大学', '医科大学', '中医药大学', '海洋大学', '外国语大学',
    '工商大学', '药科大学', '金融学院', '警察学院', '女子学院',
    '理工学院', '工程学院', '城市学院', '文理学院', '科技学院',
    '人文科技学院', '艺术学院', '美术学院', '音乐学院', '体育学院',
    '传媒学院', '中医学院', '政法学院', '民族大学', '民族学院',
    '师范学院', '商学院', '化工学院', '石油化工学院',
    '大学', '学院',
]

# Also try stripping province name prefix to find city
def get_province_by_code(code):
    return CODE_PROVINCE.get(code[:2], '')

def extract_city_from_name(name, province):
    """Try to determine city from school name."""
    base = name
    # Try stripping suffixes one at a time
    for sfx in SCHOOL_SUFFIXES:
        if base.endswith(sfx):
            base = base[:-len(sfx)]
            break

    # Check if remaining base is a known city
    if base in CITY_NAMES:
        return base

    # Check if name starts with a known city
    for city in sorted(CITY_NAMES, key=len, reverse=True):
        if name.startswith(city):
            return city

    # Check if name starts with province name → use capital
    if province and province in PROVINCE_CAPITAL:
        if name.startswith(province):
            # But check if the part after province is a city (e.g. 浙江海洋大学 → 舟山 via MANUAL_CITY already)
            # Some province-named schools are in non-capital cities
            rest = name[len(province):]
            for sfx in SCHOOL_SUFFIXES:
                if rest.endswith(sfx):
                    rest = rest[:-len(sfx)]
                    break
            if rest in CITY_NAMES:
                return rest

    # Check regional prefixes
    for region, city in REGIONAL_CITY.items():
        if name.startswith(region):
            return city

    # Fall back to province capital
    if province and province in PROVINCE_CAPITAL:
        return PROVINCE_CAPITAL[province]

    return ''

def get_location(school_code, school_name):
    province = get_province_by_code(school_code)

    # Manual override first
    if school_name in MANUAL_CITY:
        return MANUAL_CITY[school_name]

    city = extract_city_from_name(school_name, province)
    return (province, city)

def build_locations(entries):
    """Build {province: [city, ...]} map from entries."""
    locs = defaultdict(set)
    for e in entries:
        p = e.get('school_province', '')
        c = e.get('school_city', '')
        if p and c:
            locs[p].add(c)
    return {p: sorted(cities) for p, cities in locs.items()}


# ── Parse ──────────────────────────────────────────────
def parse_xls(filepath):
    wb = xlrd.open_workbook(filepath)
    sheet = wb.sheets()[0]
    records = []
    for r in range(1, sheet.nrows):
        try:
            sc = str(int(sheet.cell_value(r, 0))).zfill(4)
        except:
            sc = str(sheet.cell_value(r, 0)).strip()
        sn = str(sheet.cell_value(r, 1)).strip()
        mc = str(sheet.cell_value(r, 2)).strip()
        mn = str(sheet.cell_value(r, 3)).strip()
        if not sc or not sn:
            continue
        try:
            plan = int(sheet.cell_value(r, 4))
        except:
            plan = 0
        try:
            score = int(sheet.cell_value(r, 5))
        except:
            score = 0
        try:
            rank = int(sheet.cell_value(r, 6))
        except:
            rank = 0
        records.append([sc, sn, mc, mn, plan, score, rank])
    return records

# ── Name normalization ─────────────────────────────────
def norm(s):
    s = s.replace('（', '(').replace('）', ')')
    s = s.replace(' ', '').replace('\u3000', '')
    s = s.strip()
    return s

def base_name(s):
    """Extract base name (before first parenthesis)"""
    return re.split(r'[（(]', s)[0].strip()

# ── Fuzzy matching helpers ─────────────────────────────
def lev_dist(a, b):
    if len(a) < len(b): a, b = b, a
    if not b: return len(a)
    prev = range(len(b) + 1)
    for i, ca in enumerate(a):
        cur = [i + 1]
        for j, cb in enumerate(b):
            cost = 0 if ca == cb else 1
            cur.append(min(cur[j] + 1, prev[j + 1] + 1, prev[j] + cost))
        prev = cur
    return prev[-1]

def similarity(a, b):
    if not a or not b: return 0
    d = lev_dist(a, b)
    return 1 - d / max(len(a), len(b))

# ── Match majors within one school ─────────────────────
def match_majors(school_records_by_year):
    """
    Match majors across years. Each raw record is unique.
    Groups: each group = one major thread, gets at most 1 record per year.
    """
    years = sorted(school_records_by_year.keys())
    if not years:
        return []

    # Index by (year, row_index)
    all_records = {}  # {year: [record, ...]}
    for y in years:
        all_records[y] = school_records_by_year[y]

    # Seed groups from earliest year: each row = one group
    groups = []
    for r in all_records[years[0]]:
        groups.append({
            'base': base_name(norm(r[3])),
            'norms': {years[0]: norm(r[3])},
            'names': {years[0]: r[3]},
            'years': {years[0]: {'plan': r[4], 'score': r[5], 'rank': r[6], 'name': r[3]}},
            'scores': {years[0]: r[5]},
        })

    # Match each subsequent year
    for y in years[1:]:
        used_in_year = [False] * len(all_records[y])

        # Pass 1: exact name match (same norm)
        for gi, g in enumerate(groups):
            if y in g['years']:
                continue
            prev_norms = set(g['norms'].values())
            for ri, r in enumerate(all_records[y]):
                if used_in_year[ri]:
                    continue
                rn = norm(r[3])
                if rn in prev_norms:
                    g['years'][y] = {'plan': r[4], 'score': r[5], 'rank': r[6], 'name': r[3]}
                    g['norms'][y] = rn
                    g['names'][y] = r[3]
                    g['scores'][y] = r[5]
                    used_in_year[ri] = True
                    break

        # Pass 2: same base name + fuzzy match, with score disambiguation
        for gi, g in enumerate(groups):
            if y in g['years']:
                continue
            g_base = g['base']
            candidates = []
            for ri, r in enumerate(all_records[y]):
                if used_in_year[ri]:
                    continue
                rn = norm(r[3])
                r_base = base_name(rn)
                if r_base != g_base:
                    continue
                # When base names match, primary score is 1.0; use full sim for tiebreaking
                base_match = 1.0
                full_sim = max(similarity(rn, pn) for pn in g['norms'].values())
                # Score proximity
                prev_avg = sum(g['scores'].values()) / len(g['scores'])
                sdiff = abs(r[5] - prev_avg) if r[5] > 0 and prev_avg > 0 else 999
                candidates.append((base_match, full_sim, sdiff, ri, r))

            if not candidates:
                continue

            # If only 1 candidate, take it (same base = same major)
            if len(candidates) == 1:
                _, _, _, best_ri, best_r = candidates[0]
                g['years'][y] = {'plan': best_r[4], 'score': best_r[5], 'rank': best_r[6], 'name': best_r[3]}
                g['norms'][y] = norm(best_r[3])
                g['names'][y] = best_r[3]
                g['scores'][y] = best_r[5]
                used_in_year[best_ri] = True
            else:
                # Multiple candidates: sort by full_sim desc, sdiff asc
                candidates.sort(key=lambda x: (-x[1], x[2]))
                best_c = candidates[0]
                full_sim = best_c[1]
                if full_sim >= 0.6 or (full_sim >= 0.5 and best_c[2] <= 30):
                    _, _, _, best_ri, best_r = best_c
                    g['years'][y] = {'plan': best_r[4], 'score': best_r[5], 'rank': best_r[6], 'name': best_r[3]}
                    g['norms'][y] = norm(best_r[3])
                    g['names'][y] = best_r[3]
                    g['scores'][y] = best_r[5]
                    used_in_year[best_ri] = True

        # Pass 3: fuzzy match across all names + score proximity (for base-name changes)
        for gi, g in enumerate(groups):
            if y in g['years']:
                continue
            candidates = []
            for ri, r in enumerate(all_records[y]):
                if used_in_year[ri]:
                    continue
                rn = norm(r[3])
                best_nsim = max(similarity(rn, pn) for pn in g['norms'].values())
                prev_avg = sum(g['scores'].values()) / len(g['scores'])
                sdiff = abs(r[5] - prev_avg) if r[5] > 0 and prev_avg > 0 else 999
                candidates.append((best_nsim, sdiff, ri, r))

            if not candidates:
                continue

            candidates.sort(key=lambda x: (-x[0], x[1]))
            best_nsim, best_sdiff, best_ri, best_r = candidates[0]

            # Higher threshold for cross-base match
            if best_nsim >= 0.75 or (best_nsim >= 0.6 and best_sdiff <= 20):
                if best_sdiff > 60 and best_nsim < 0.85:
                    continue
                g['years'][y] = {'plan': best_r[4], 'score': best_r[5], 'rank': best_r[6], 'name': best_r[3]}
                g['norms'][y] = norm(best_r[3])
                g['names'][y] = best_r[3]
                g['scores'][y] = best_r[5]
                used_in_year[best_ri] = True

        # Remaining records become new groups
        for ri, r in enumerate(all_records[y]):
            if not used_in_year[ri]:
                g = {
                    'base': base_name(norm(r[3])),
                    'norms': {y: norm(r[3])},
                    'names': {y: r[3]},
                    'years': {y: {'plan': r[4], 'score': r[5], 'rank': r[6], 'name': r[3]}},
                    'scores': {y: r[5]},
                }
                groups.append(g)

    return groups

# ── Main ───────────────────────────────────────────────
def main():
    base = sys.argv[1] if len(sys.argv) > 1 else '/workspaces/ori-db'
    out = sys.argv[2] if len(sys.argv) > 2 else '/workspaces/2026-ZJ_ScoreDB/public'

    # 1. Parse all years
    by_year = {}
    for fprefix, year in YEARS.items():
        fp = os.path.join(base, f'{fprefix}.xls')
        by_year[year] = parse_xls(fp)
        print(f'{year}: {len(by_year[year])} records')

    # 2. Build school index by code (codes are stable)
    # school_code -> { canonical_name, name_history: {year: name}, years_present }
    school_index = defaultdict(lambda: {'name_history': {}, 'years_present': set()})
    for year, recs in by_year.items():
        for r in recs:
            sc, sn = r[0], r[1]
            school_index[sc]['name_history'][year] = sn
            school_index[sc]['years_present'].add(year)

    # Determine canonical school name (most common)
    for sc, info in school_index.items():
        name_counts = defaultdict(int)
        for year, recs in by_year.items():
            for r in recs:
                if r[0] == sc:
                    name_counts[r[1]] += 1
        info['canonical_name'] = max(name_counts, key=name_counts.get)

    print(f'Schools: {len(school_index)}')

    # 3. Group records by school_code
    school_records = defaultdict(lambda: defaultdict(list))
    for year, recs in by_year.items():
        for r in recs:
            school_records[r[0]][year].append(r)

    # 4. Match majors within each school
    all_majors = []  # flat list of all matched major records
    for sc, yearly_recs in school_records.items():
        # Get latest school name
        school_name = school_index[sc]['canonical_name']
        school_province, school_city = get_location(sc, school_name)
        groups = match_majors(yearly_recs)

        for g in groups:
            # Determine canonical major name
            name_counts = defaultdict(int)
            for y, yr in g['years'].items():
                name_counts[yr['name']] += 1
            canonical_major = max(name_counts, key=name_counts.get)

            # Compute volatility
            scores = [yr['score'] for yr in g['years'].values() if yr['score'] > 0]
            avg_score = sum(scores) / len(scores) if scores else 0
            volatility = 0
            if len(scores) > 1:
                variance = sum((s - avg_score) ** 2 for s in scores) / len(scores)
                volatility = variance ** 0.5

            entry = {
                'school_code': sc,
                'school_name': school_name,
                'school_province': school_province,
                'school_city': school_city,
                'name_history': school_index[sc]['name_history'],
                'major_name': canonical_major,
                'name_history_major': {y: yr['name'] for y, yr in g['years'].items()},
                '2023': g['years'].get('2023', None),
                '2024': g['years'].get('2024', None),
                '2025': g['years'].get('2025', None),
                'avg_score': round(avg_score, 1),
                'volatility': round(volatility, 1),
            }
            all_majors.append(entry)

    print(f'Merged majors: {len(all_majors)}')

    # 5. Write output files
    # Raw per-year data (for reference)
    for year in YEARS.values():
        out_data = [[r[0], r[1], r[2], r[3], r[4], r[5], r[6]] for r in by_year[year]]
        with open(os.path.join(out, f'data_{year}.json'), 'w', encoding='utf-8') as f:
            json.dump(out_data, f, ensure_ascii=False)
        print(f'  Wrote data_{year}.json: {len(out_data)} records')

    # Merged data
    with open(os.path.join(out, 'merged.json'), 'w', encoding='utf-8') as f:
        json.dump(all_majors, f, ensure_ascii=False)
    print(f'Wrote merged.json: {len(all_majors)} entries')

    # Heatmap points
    heatmap_points = []
    for entry in all_majors:
        for year in ['2023', '2024', '2025']:
            d = entry[year]
            if d and d['score'] > 0:
                heatmap_points.append({
                    'school_code': entry['school_code'],
                    'school_name': entry['school_name'],
                    'school_province': entry['school_province'],
                    'school_city': entry['school_city'],
                    'major_name': d['name'],
                    'score': d['score'],
                    'rank': d['rank'],
                    'plan': d['plan'],
                    'year': year,
                    'major_avg': entry['avg_score'],
                    'major_volatility': entry['volatility'],
                })
    with open(os.path.join(out, 'heatmap.json'), 'w', encoding='utf-8') as f:
        json.dump(heatmap_points, f, ensure_ascii=False)
    print(f'Wrote heatmap.json: {len(heatmap_points)} points')

    # Locations (province → cities)
    locations = build_locations(all_majors)
    with open(os.path.join(out, 'locations.json'), 'w', encoding='utf-8') as f:
        json.dump(locations, f, ensure_ascii=False)
    print(f'Wrote locations.json: {len(locations)} provinces')

    # Schools index (for reference)
    schools_out = []
    for sc, info in sorted(school_index.items()):
        schools_out.append({
            'code': sc,
            'name': info['canonical_name'],
            'name_history': info['name_history'],
        })
    with open(os.path.join(out, 'schools.json'), 'w', encoding='utf-8') as f:
        json.dump(schools_out, f, ensure_ascii=False)
    print(f'Wrote schools.json: {len(schools_out)} schools')

    print('Done!')

if __name__ == '__main__':
    main()
