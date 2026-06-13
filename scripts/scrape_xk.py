import json, re, urllib.request, urllib.error, time, os, sys

BASE_URL = "https://www.zjzs.net/col/xk2024/"
OUTPUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'xk_requirements.json')
PROGRESS_FILE = '/tmp/xk_scrape_progress.json'

def fetch(url, retries=3):
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            with urllib.request.urlopen(req, timeout=15) as resp:
                return resp.read().decode('utf-8')
        except Exception as e:
            if i < retries - 1:
                time.sleep(1)
            else:
                raise e
    return None

def parse_school_page(html):
    results = []
    rows = re.findall(r'<tr[^>]*>.*?</tr>', html, re.DOTALL)
    for row in rows:
        cells = re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', row, re.DOTALL)
        if len(cells) >= 3:
            level = re.sub(r'<[^>]+>', '', cells[0]).strip()
            major = re.sub(r'<[^>]+>', '', cells[1]).strip()
            requirement = re.sub(r'<[^>]+>', '', cells[2]).strip()
            sub_majors = re.sub(r'<[^>]+>', '', cells[3]).strip() if len(cells) >= 4 else ""
            if level in ('本科', '高职(专科)') and major and requirement:
                if major in ('专业(类)名称',) or level in ('层次',):
                    continue
                results.append({
                    'level': level,
                    'major': major,
                    'requirement': requirement,
                    'sub_majors': sub_majors
                })
    return results

def save_progress(all_data, errors, done_codes):
    with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
        json.dump({'done_codes': done_codes}, f, ensure_ascii=False)
    # Also save data periodically
    output = {
        'total_scraped': len(all_data),
        'total_errors': len(errors),
        'schools': all_data,
        'errors': [{'code': c, 'name': n, 'error': e} for c, n, e in errors]
    }
    with open(OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return set(data.get('done_codes', []))
    return set()

def main():
    with open('/tmp/school_mapping.json', 'r', encoding='utf-8') as f:
        mapping = json.load(f)
    
    codes = list(mapping['matched'].keys())
    done_codes = load_progress()
    
    print(f"Total: {len(codes)}, Already done: {len(done_codes)}")
    
    all_data = {}
    errors = []
    
    # Load existing data if any
    if os.path.exists(OUTPUT):
        with open(OUTPUT, 'r', encoding='utf-8') as f:
            existing = json.load(f)
        all_data = existing.get('schools', {})
        errors = [tuple(x.values()) if isinstance(x, dict) else x for x in existing.get('errors', [])]
    
    remaining = [c for c in codes if c not in done_codes]
    print(f"Remaining: {len(remaining)}")
    
    for i, code in enumerate(remaining):
        name = mapping['matched'][code]['name']
        url = f"{BASE_URL}{code}.html"
        
        try:
            html = fetch(url)
            if html:
                data = parse_school_page(html)
                if data:
                    all_data[code] = {
                        'school_name': name,
                        'province': mapping['matched'][code]['province'],
                        'majors': data
                    }
                    print(f"[{i+1}/{len(remaining)}] {name} ({code}): {len(data)} majors")
                else:
                    print(f"[{i+1}/{len(remaining)}] {name} ({code}): NO DATA")
                    errors.append((code, name, 'no_data'))
            else:
                errors.append((code, name, 'fetch_failed'))
        except Exception as e:
            print(f"[{i+1}/{len(remaining)}] ERROR {name} ({code}): {e}")
            errors.append((code, name, str(e)))
        
        done_codes.add(code)
        
        # Save every 50 schools
        if (i+1) % 50 == 0:
            save_progress(all_data, errors, list(done_codes))
            print(f"  --- Saved progress ({len(all_data)} schools) ---")
            time.sleep(0.5)
    
    # Final save
    save_progress(all_data, errors, list(done_codes))
    print(f"\nDone! Scraped {len(all_data)} schools, {len(errors)} errors")
    print(f"Output: {OUTPUT}")

if __name__ == '__main__':
    main()
