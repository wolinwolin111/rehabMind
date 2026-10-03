"""Extract preserved source material into a native professional reading edition.

Original files are never modified. Cycle fragments are parsed separately because
the imported HTML has unbalanced divs which detach first-stage exercises.
"""
import json
import re
from pathlib import Path
from lxml import html

ROOT = Path(__file__).resolve().parents[2]

def text(node):
    return re.sub(r'\s+', ' ', node.text_content()).strip() if node is not None else ''

def nodes(node, name):
    return node.xpath('.//*[contains(concat(" ",normalize-space(@class)," ")," ' + name + ' ")]')

def first(node, selector):
    found = node.xpath(selector)
    return text(found[0]) if found else ''

def items(node):
    if node is None:
        return []
    found = node.xpath('.//li') or node.xpath('.//p')
    return [text(n) for n in found if text(n)]

# Clinical reading labels, not new exercise prescriptions. Assessment topics
# summarise the same stage goals and progression criteria in the source.
EDITS = {
 'acl': {
  'title': 'ACL 重建', 'subtitle': '移植物保护 · 伸膝与力量 · 回归运动',
  'phase_titles': ['早期保护与主动伸膝', '活动度与基础负重', '力量与单腿控制', '跑跳与减速', '专项回归'],
  'assessment': [
   ['关节积液、伤口与负重反应', '主动／被动伸膝、伸膝迟滞', '股四头肌募集、直腿抬高与步态'],
   ['屈膝活动度与伸膝保持', '闭链动作质量与膝前痛', '步行耐受、训练后积液反应'],
   ['股四头肌、腘绳肌与髋肌力量', '单腿负重、膝髋控制与代偿', '跑步前的积液、活动度与力量条件'],
   ['跑步耐受与次日关节反应', '起跳、落地和减速质量', '力量、爆发力与双侧差异'],
   ['专项力量、速度与动作质量', '跳跃、减速、变向和疲劳下控制', '运动信心、专项暴露与回归准备']],
  'checks': ['移植物类型与取腱部位', '半月板、软骨及其他韧带合并处理', '负重、支具、活动度和开链训练限制'],
  'default_path': 'path-reconstruction',
 },
 'meniscus': {
  'title': '半月板术后', 'subtitle': '部分切除与修复，分别查阅保护要求',
  'phase_titles': ['术式确认与早期保护', '活动度、步态与基础力量', '力量与单腿负重', '跑步与专项回归'],
  'assessment': [
   ['术式、撕裂形态与修复部位', '积液、疼痛和关节交锁', '伸膝、股四头肌募集与负重耐受'],
   ['允许范围内的屈伸活动度', '步态、负重分配与闭链控制', '关节线疼痛、积液及次日反应'],
   ['股四头肌、髋肌与小腿力量', '台阶、单腿负重和重复动作耐受', '跑步准备与关节症状反应'],
   ['跑步、落地与变向质量', '重复负荷后的积液、关节线疼痛', '专项能力与回归条件']],
  'checks': ['部分切除或修复；撕裂形态与位置', '是否根部、放射状或复杂修复', '负重、屈膝和深屈膝负荷限制'],
  'default_path': 'path-repair',
 },
 'acl-meniscus': {
  'title': 'ACL ＋ 半月板术后', 'subtitle': '同时考虑移植物与半月板保护',
  'phase_titles': ['联合保护与伸膝恢复', '活动度与基础负重', '力量与跑步准备', '跑跳、变向与回归'],
  'assessment': [
   ['ACL 移植物与半月板处理方式', '伸膝、积液与股四头肌募集', '支具、负重和屈膝限制'],
   ['允许范围内的活动度与步态', '闭链力量与负重分配', '关节线疼痛、积液和膝前痛'],
   ['股四头肌、腘绳肌与单腿控制', '重复负荷后关节反应', 'ACL 跑步条件与半月板保护条件'],
   ['落地、减速、变向与专项能力', '力量与功能测试中的双侧差异', '专项暴露后的症状和回归信心']],
  'checks': ['ACL 移植物、取腱部位及固定方式', '半月板切除、标准修复或根部／放射状修复', '两项手术中更严格的负重和活动度限制'],
  'default_path': 'path-repair',
 },
 'pcl': {
  'title': 'PCL 重建与损伤', 'subtitle': '后向应力保护 · 股四头肌 · 动态稳定',
  'phase_titles': ['胫骨位置保护与股四头肌', '步态、活动度与闭链力量', '全下肢力量与跑步准备', '跑跳、减速与专项回归'],
  'assessment': [
   ['胫骨后坠、后向不稳与支具支撑', '积液、伸膝和股四头肌募集', '直腿抬高与保护性步态'],
   ['允许范围内的屈膝与负重', '股四头肌主导的闭链动作', '步行耐受与后向不稳感'],
   ['股四头肌、髋肌和小腿力量', '获准后的腘绳肌负荷耐受', '单腿控制、跑步准备与后向不稳'],
   ['跳跃、减速、变向与疲劳下控制', '专项负荷后的膝后痛与积液', '力量、稳定性与运动信心']],
  'checks': ['重建或孤立损伤保守治疗', '是否合并 PLC 或其他韧带处理', '胫骨支撑、屈膝、负重与腘绳肌负荷限制'],
  'default_path': 'path-reconstruction',
 },
 'patellar-dislocation': {
  'title': '髌骨不稳与 MPFL 术后', 'subtitle': '稳定性 · 伸膝控制 · 全下肢动作质量',
  'phase_titles': ['早期保护与伸膝控制', '活动度、步态与基础力量', '单腿力量与动态控制', '跑跳与专项回归'],
  'assessment': [
   ['骨软骨损伤与手术处理范围', '积液、伸膝与股四头肌募集', '髌骨不稳感与活动恐惧'],
   ['允许范围内的屈伸与步态', '股四头肌和髋肌基础力量', '髌骨周围疼痛、轨迹与不稳感'],
   ['台阶、下蹲和单腿支撑质量', '膝髋控制、力量和耐力', '运动恐惧与负荷后关节反应'],
   ['落地、减速与变向质量', '专项负荷与髌骨稳定性', '力量、功能和心理准备']],
  'checks': ['非手术、单纯 MPFL 或联合骨性手术', '骨软骨损伤、截骨或软骨修复', '支具、负重、屈膝及骨愈合要求'],
  'default_path': 'path-mpfl',
 },
 'achilles-rupture': {
  'title': '跟腱修复与部分损伤', 'subtitle': '长度保护 · 小腿力量 · 弹性与跑跳',
  'phase_titles': [],
  'assessment': [
   ['伤口、保护靴和楔垫设置', '疼痛、肿胀及小腿异常症状', '髋膝、足趾与基础转移能力'],
   ['允许范围内的主动踝控制', '靴内负重与步态', '跖屈收缩和训练后跟腱反应'],
   ['脱靴步态与踝活动度', '提踵高度、控制和小腿力量', '单腿承重与次日跟腱反应'],
   ['单腿提踵高度、耐力与力量', '弹性、落地和跑步耐受', '专项负荷与跟腱长度／功能表现']],
  'checks': ['急性完全断裂修复或部分损伤', '是否慢性断裂、再断裂或重建增强', '保护靴、减楔、负重与背屈限制'],
  'default_path': 'path-operative',
 },
}

catalog = json.loads((ROOT / 'src/content/postop-catalog.json').read_text(encoding='utf-8'))
output = []
for guide in catalog:
    source = (ROOT / 'public' / guide['file']).read_text(encoding='utf-8')
    doc = html.fromstring(source)
    edit = EDITS[guide['id']]
    paths = []
    for route in nodes(doc, 'path-dossier'):
        title_node = route.xpath('.//h3')[0]
        title = ''.join(title_node.itertext()).strip()
        for sup in title_node.xpath('.//sup'):
            title = title.replace(text(sup), '')
        fields = {}
        for dt in route.xpath('.//dt'):
            dd = dt.getnext()
            if dd is not None:
                fields[text(dt)] = text(dd)
        paths.append({'id': route.get('id'), 'title': title, 'scope': fields.get('适用范围', ''), 'protection': fields.get('最先确认', ''), 'connection': fields.get('如何衔接', ''), 'exclude': fields.get('不适用', ''), 'has_phases': True})

    phases = []
    # Each fragment ends at the next cycle, so misplaced exercise divs remain
    # in their source stage rather than disappearing from the parsed DOM.
    for fragment in re.split(r'<details class="cycle-panel"', source)[1:]:
        phase = html.fromstring('<details class="cycle-panel"' + fragment)
        cycle = phase if phase.get('id') else nodes(phase, 'cycle-panel')[0]
        phase_id = cycle.get('id')
        if guide['id'] == 'achilles-rupture' and '-path-3-' in phase_id:
            continue  # Tendinopathy is not a postoperative/rupture pathway.
        title = first(phase, './/*[contains(@class,"cycle-title")]/strong')
        position = len(phases) if guide['id'] != 'achilles-rupture' else (len(phases) % 4)
        title = edit['phase_titles'][position] if edit['phase_titles'] else re.sub(r'^阶段[一二三四五六]+[｜丨：]', '', title)
        priorities = nodes(phase, 'cycle-priority')[0].xpath('./div')
        exercises = []
        for exercise in nodes(phase, 'exercise-card'):
            detail = []
            for block in nodes(exercise, 'exercise-body')[0].xpath('./div'):
                if first(block, './span') == '停止或退阶':
                    detail.append({'label': '停止或退阶', 'text': first(block, './p')})
            exercises.append({'name': first(exercise, './/*[contains(@class,"exercise-name")]/strong'), 'purpose': first(exercise, './/*[contains(@class,"exercise-name")]/small'), 'details': detail})
        phases.append({'id': phase_id, 'title': title, 'time': first(phase, './/time'), 'goals': items(priorities[0]), 'protection': items(priorities[1]), 'progression': items(priorities[2]), 'assessment': edit['assessment'][position], 'exercises': exercises, 'alerts': items(nodes(phase, 'safety-bar')[0])})

    if guide['id'] == 'acl':
        # Thigh circumference is not an effusion measure. Keep both assessments
        # distinct rather than reproduce the source's conflated criterion.
        phases[0]['progression'][0] = '关节积液趋于稳定或下降，当前负重后无持续加重。'
        phases[1]['protection'] = ['开链伸膝的角度、负荷和开始时机结合移植物、合并手术及手术团队限制。']
        phases[2]['progression'] = ['完全伸膝保持，关节积液与重复负荷反应稳定。', '股四头肌力量与单腿控制达到所选回归跑步方案的要求。', '单腿下蹲、台阶和跑步准备动作质量可接受。']
        phases[3]['progression'] = ['走跑训练后症状与积液反应稳定。', '落地、减速和重复冲击动作质量可接受。', '力量、跳跃表现与动作质量结合评估；双侧对称指数不单独作为通行标准。']
        phases[4]['progression'] = ['满足移植物愈合所需时间及手术团队要求。', '完成专项变向、对抗与疲劳下动作测试，并评估绝对力量和双侧差异。', '运动信心、专项暴露与医疗团队的回归评估相一致。']
    if guide['id'] == 'meniscus':
        for p in phases:
            p['time'] = ''  # Repair and resection must not share a time window.
        phases[1]['goals'] = ['在对应术式允许的范围内恢复活动度、负重与步态。']
        phases[1]['protection'] = ['修复路径的屈膝、深屈膝负荷与负重上限按撕裂形态和手术限制执行。']
        phases[2]['progression'][2] = '修复路径在保护条件解除并完成随访评估后，再进入跑步准备。'
        phases[3]['progression'] = ['部分切除与修复分别核对组织保护时间、功能和专项需求；不共用起跑周数。', '跑步后关节线症状与积液反应稳定。', '力量、单腿控制和专项暴露满足目标活动要求，并完成回归评估。']
    if guide['id'] == 'acl-meniscus':
        phases[2]['progression'] = ['同时满足 ACL 跑步准备条件与半月板保护要求。', '重复登阶等负荷后无持续关节线症状或积液加重。', '单腿控制与力量达到所选回归跑步方案要求，修复路径结合手术随访评估。']
        phases[3]['progression'] = ['深屈膝、跳跃和旋转类负荷已获得对应修复路径许可。', '力量、跳跃与动作质量结合评估，兼顾绝对能力和双侧差异。', '完成专项训练并满足组织愈合时间与医疗团队回归要求。']
    # Remove patient-facing wording without changing the underlying criterion.
    for p in phases:
        p['path_overrides'] = []
        for field in ['progression', 'protection']:
            p[field] = [s.replace('好腿', '健侧').replace('（正式测试由医疗人员实施）', '').replace('（测试由医疗人员实施）', '').replace('慢跑前自查通过', '跑步准备评估符合所选方案要求').replace('不要自行突破90°或其他术者限制', '屈膝范围遵循当期手术限制') for s in p[field]]
    if guide['id'] == 'meniscus':
        resection_goals = ['控制积液，恢复伸膝、股四头肌募集与负重步态。', '恢复屈伸活动度、步态与基础闭链力量。', '恢复台阶、单腿控制和重复负荷耐受。', '结合功能表现恢复跑跳和专项负荷。']
        resection_guards = ['核对合并手术；活动度和负重结合疼痛、积液与术后限制。', '活动度和负重不套用半月板修复的限制，观察关节线疼痛与积液。', '重复负荷结合关节反应、力量和动作质量调整。', '回归跑步与运动结合力量、动作质量和负荷耐受评估。']
        for i, p in enumerate(phases):
            progression = p['progression']
            if i == 0:
                progression = ['术式与合并处理已明确。', '当前负荷下疼痛、积液与次日反应稳定。', '伸膝、股四头肌募集和步态逐步恢复。']
            elif i == 2:
                progression = progression[:2]
            p['path_overrides'].append({'path_id': 'path-meniscectomy', 'goals': [resection_goals[i]], 'protection': [resection_guards[i]], 'progression': progression})
    if guide['id'] == 'acl-meniscus':
        for i, p in enumerate(phases):
            p['path_overrides'].append({'path_id': 'path-meniscectomy', 'goals': ['恢复伸膝和股四头肌控制，兼顾积液与切除术后反应。'] if i == 0 else p['goals'], 'protection': ['以 ACL 移植物及合并手术限制为主；部分切除后的较快恢复不提前解除 ACL 保护。'], 'progression': [s.replace('修复路径结合手术随访评估', '结合手术随访评估').replace('修复路径许可', '手术限制许可') for s in p['progression']]})
    if guide['id'] == 'patellar-dislocation':
        for p in phases:
            p['time'] = ''  # Original stage timing mixes nonoperative and MPFL.
    for route in paths:
        if guide['id'] == 'achilles-rupture':
            route['phase_ids'] = [p['id'] for p in phases if ('-path-1-' if route['id'] == 'path-operative' else '-path-2-') in p['id']] if route['id'] in ['path-operative', 'path-nonop'] else []
        elif route['id'] == edit['default_path'] or (guide['id'] in ['meniscus', 'acl-meniscus'] and route['id'] == 'path-meniscectomy') or (guide['id'] == 'patellar-dislocation' and route['id'] == 'path-nonop'):
            route['phase_ids'] = [p['id'] for p in phases]
        else:
            route['phase_ids'] = []
        route['has_phases'] = bool(route['phase_ids'])
        # No standard repair or conservative route should silently inherit
        # another procedure's numerical calendar.
        route['show_time'] = route['id'] == edit['default_path'] and guide['id'] not in ['meniscus', 'patellar-dislocation']
        if guide['id'] == 'achilles-rupture':
            route['show_time'] = route['has_phases']

    references = []
    for refs in nodes(doc, 'refs'):
        for li in refs.xpath('./li'):
            links = li.xpath('.//a[@href]')
            if links:
                references.append({'title': text(links[0]), 'url': links[0].get('href'), 'scope': first(li, './span')})
    return_criteria = items(nodes(doc, 'return-panel')[0])
    if guide['id'] == 'acl':
        return_criteria = ['疼痛、关节积液与活动度符合目标活动需求。', '关节稳定性、绝对力量和双侧差异结合评估。', '跳跃、落地、减速与变向质量符合专项需求。', '结合 ACL-RSI 等工具评估心理准备与运动信心。', '从参与训练、专项训练到比赛逐步恢复，并完成医疗团队的回归评估。']
    else:
        return_criteria = [s.replace('好腿', '健侧').replace('自己心里', '心理准备') for s in return_criteria]
    output.append({**guide, 'title': edit['title'], 'subtitle': edit['subtitle'], 'checks': edit['checks'], 'default_path': edit['default_path'], 'paths': paths, 'phases': phases, 'return_criteria': return_criteria, 'references': references, 'edition': 'professional-2026-10-02'})

target = ROOT / 'src/content/postop-professional.json'
target.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'{len(output)} guides, {sum(len(g["phases"]) for g in output)} stages, {sum(len(p["exercises"]) for g in output for p in g["phases"])} exercise references')
