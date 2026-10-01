"""Author surface labels on the original mesh; runtime only reads this atlas.

Charts and landmarks are specific to this model, not clinical tissue boundaries.
No legacy face label takes priority over the reviewed surface annotations.
"""
from __future__ import annotations
import bisect
import hashlib
import json
import math
import struct
from pathlib import Path


def vertices(raw, info):
    return [struct.unpack_from('<3f', raw, info['positions'] + i * 12)
            for i in range(info['vertexCount'])]


def triangles(raw, info):
    points = vertices(raw, info)
    return [tuple(points[i] for i in struct.unpack_from('<3I', raw, info['indices'] + face * 12))
            for face in range(info['indexCount'] // 3)]


def section(tris, height, side, upper_x=.18, lower_x=.015):
    points = []
    sign = 1 if side == 'left' else -1
    for tri in tris:
        if not min(p[1] for p in tri) <= height <= max(p[1] for p in tri):
            continue
        for a, b in zip(tri, tri[1:] + tri[:1]):
            if a[1] == b[1] or not min(a[1], b[1]) <= height <= max(a[1], b[1]):
                continue
            t = (height - a[1]) / (b[1] - a[1])
            x, z = a[0] + t * (b[0] - a[0]), a[2] + t * (b[2] - a[2])
            if lower_x < sign * x < upper_x:
                points.append((sign * x, z))
    return points


def midpoint(a, b):
    return tuple((x + y) / 2 for x, y in zip(a, b))


def mean(points):
    return [sum(p[i] for p in points) / len(points) for i in range(3)]


def bounds(points):
    return [[min(p[i] for p in points), max(p[i] for p in points)] for i in range(3)]


def build_surface_atlas(root: Path, atlas, raw_for, skin_bytes, skin_info):
    config = json.loads((root / 'scripts/surface_regions.json').read_text(encoding='utf-8'))
    skin_hash = hashlib.sha256(skin_bytes).hexdigest()
    if skin_hash != config['source_skin_sha256']:
        raise ValueError('Surface annotations require review for this skin geometry')
    data = json.loads((root / 'build/knowledge/runtime.json').read_text(encoding='utf-8'))
    regions = {r['region_id']: r for r in data['tables']['01_Region']}
    locations = {r['Area_ID']: r for r in data['clinical_extension']['LocationGuide']}
    names = {key: data.get('region_display_names', {}).get(key, r['l3_region']) for key, r in regions.items()}
    entries, entry_ids = [None], {}

    def entry(target, side):
        key = (target, side)
        if key not in entry_ids:
            if target in locations:
                loc = locations[target]
                ids = loc['Region_IDs'].split('|')
                value = {'areaId': target, 'regionId': ids[0], 'regionIds': ids,
                         'displayName': loc['Display_Name']}
            elif target in regions:
                ids = [target]
                value = {'regionId': target, 'displayName': names[target]}
            else:
                raise ValueError(f'Unknown surface target {target}')
            value.update(side=side, module=regions[ids[0]]['module'], source='surface')
            entry_ids[key] = len(entries)
            entries.append(value)
        return entry_ids[key]

    skin_tris = triangles(skin_bytes, skin_info)
    calf_cfg = config['calf_chart']
    charts, knee_charts, thigh_charts, foot_landmarks, patella_refs = {}, {}, {}, {}, {}
    bone_hashes = {}

    def bone(name):
        part = next(p for p in atlas['parts'] if p['name'] == name)
        raw = raw_for(part)
        points = vertices(raw, part)
        bone_hashes[part['id']] = hashlib.sha256(raw[part['positions']:part['positions'] + part['vertexCount'] * 12]).hexdigest()
        return points, triangles(raw, part)

    def skin_rows(heights, side, upper_x=.18, lower_x=.015):
        rows = []
        for y in heights:
            points = section(skin_tris, y, side, upper_x, lower_x)
            if not points:
                raise ValueError(f'Missing skin section {side}/{y}')
            rows.append({'y': y, 'bounds': [min(p[0] for p in points), max(p[0] for p in points),
                                           min(p[1] for p in points), max(p[1] for p in points)]})
        return rows

    for side in ('left', 'right'):
        title = side.title()
        tibia, tibial_tris = bone(f'{title} tibia')
        bone(f'{title} fibula')
        bone(f'{title} femur')
        patella, _ = bone(f'{title} patella')
        pb = bounds(patella)
        patella_refs[side] = {'center_x': sum(abs(x) for x in pb[0]) / 2,
                              'width': pb[0][1] - pb[0][0], 'bounds': pb}
        rows = skin_rows(calf_cfg['section_heights'], side)
        for row in rows:
            points = section(tibial_tris, row['y'], side)
            if not points:
                raise ValueError(f'Missing tibial section {side}/{row["y"]}')
            xmin, xmax, zmin, zmax = row['bounds']
            cx, cz, rx, rz = (xmin + xmax)/2, (zmin + zmax)/2, (xmax - xmin)/2, (zmax - zmin)/2
            front_z = max(p[1] for p in points)
            ridge = [p for p in points if p[1] >= front_z - .001]
            bx = sum(p[0] for p in ridge)/len(ridge)
            row.update(tibial_front_angle=math.degrees(math.atan2((bx-cx)/rx, (front_z-cz)/rz)),
                       tibial_front=[bx, front_z])
        charts[side] = rows
        knee_charts[side] = skin_rows(config['knee_chart']['section_heights'], side)
        thigh_charts[side] = skin_rows(config['thigh_chart']['section_heights'], side, .24, .001)

        refs = {}
        for key, name in [('heel', f'{title} calcaneus'), ('talus', f'{title} talus'),
                          ('navicular', f'Navicular bone of {side} foot'),
                          ('cuboid', f'{title} cuboid bone'),
                          ('cuneiform', f'{title} medial cuneiform bone')]:
            points, _ = bone(name)
            refs[key] = {'center': mean(points), 'bounds': bounds(points)}
        met_points = [bone(f'{title} {n} metatarsal bone')[0]
                      for n in ('first', 'second', 'third', 'fourth', 'fifth')]
        sign = 1 if side == 'left' else -1
        heel = refs['heel']['center']
        # Direction follows the actual foot rather than global front / side.
        heads = [mean([p for p in points if p[2] > max(v[2] for v in points)-.004])
                 for points in met_points]
        head_center = mean(heads[1:4])
        dx, dz = sign*(head_center[0]-heel[0]), head_center[2]-heel[2]
        length = math.hypot(dx, dz)
        forward, lateral = [dx/length, dz/length], [dz/length, -dx/length]

        def project(p):
            x, z = sign*(p[0]-heel[0]), p[2]-heel[2]
            return [x*forward[0]+z*forward[1], x*lateral[0]+z*lateral[1]]

        metatarsals = []
        for points in met_points:
            projections = [project(p)[0] for p in points]
            lo, hi = min(projections), max(projections)
            head = mean([p for p, f in zip(points, projections) if f > hi-.004])
            base = mean([p for p, f in zip(points, projections) if f < lo+.004])
            metatarsals.append({'head': head, 'base': base, 'head_fl': project(head),
                                'base_fl': project(base), 'bounds': bounds(points)})
        toes = []
        for ordinal in ('big', 'second', 'third', 'fourth', 'little'):
            proximal, _ = bone(f'Proximal phalanx of {side} {ordinal} toe')
            distal, _ = bone(f'Distal phalanx of {side} {ordinal} toe')
            toes.append({'center': mean(proximal+distal), 'distal': mean(distal),
                         'fl': project(mean(proximal+distal))})
        for value in refs.values():
            value['fl'] = project(value['center'])
        foot_landmarks[side] = {**refs, 'forward': forward, 'lateral': lateral,
                               'metatarsals': metatarsals, 'toes': toes}

    def chart_point(rows, p):
        heights = [r['y'] for r in rows]
        upper_index = min(len(rows)-1, max(1, bisect.bisect_left(heights, p[1])))
        lo, hi = rows[upper_index-1], rows[upper_index]
        t = max(0, min(1, (p[1]-lo['y'])/(hi['y']-lo['y'])))
        xmin, xmax, zmin, zmax = [a+t*(b-a) for a,b in zip(lo['bounds'],hi['bounds'])]
        nx = (abs(p[0])-(xmin+xmax)/2)/((xmax-xmin)/2)
        nz = (p[2]-(zmin+zmax)/2)/((zmax-zmin)/2)
        angle = math.degrees(math.atan2(nx,nz))
        ridge = lo.get('tibial_front_angle',0)+t*(hi.get('tibial_front_angle',0)-lo.get('tibial_front_angle',0))
        return angle, ridge

    def chart_target(cfg, rows, p, side):
        angle, ridge = chart_point(rows, p)
        for patch in cfg['patches']:
            if not patch.get('y',cfg['y_range'])[0] <= p[1] <= patch.get('y',cfg['y_range'])[1]:
                continue
            a = angle-ridge if patch.get('relative_to')=='tibial_front' else angle
            if not patch['angle'][0] <= a <= patch['angle'][1]:
                continue
            if 'patella_lateral_fraction' in patch:
                ref = patella_refs[side]
                fraction = (abs(p[0])-ref['center_x'])/ref['width']
                if not patch['patella_lateral_fraction'][0] <= fraction <= patch['patella_lateral_fraction'][1]:
                    continue
            return entry(patch['target'], side)
        raise ValueError(f'Uncovered authored surface {side}/{p}/{angle}')

    def foot_target(p, normal, side):
        cfg, ref = config['foot_chart'], foot_landmarks[side]
        sign = 1 if side=='left' else -1
        heel = ref['heel']['center']
        dx, dz = sign*(p[0]-heel[0]), p[2]-heel[2]
        f = dx*ref['forward'][0]+dz*ref['forward'][1]
        l = dx*ref['lateral'][0]+dz*ref['lateral'][1]
        lateral_normal = sign*normal[0]*ref['lateral'][0]+normal[2]*ref['lateral'][1]
        plantar = normal[1] < cfg['plantar_normal_y']
        if (p[1] >= cfg['ankle_start_y'] and f<cfg['ankle_high_front_limit']) or (p[1]>=cfg['ankle_low_y'] and f<cfg['ankle_front_limit']):
            # Ankle directions use the actual ankle skin section, not foot yaw.
            angle, _ = chart_point(charts[side], p)
            target = 'AF-R-001' if -50<=angle<=50 else 'AF-R-003' if 50<angle<145 else 'AF-R-002' if -145<angle<-50 else 'AF-R-004'
            return entry(target,side)
        if f < cfg['heel_plantar_front']:
            target = 'AF-R-006' if plantar else 'AF-R-005' if f<cfg['heel_back_limit'] else 'AF-R-007'
            return entry(target,side)
        mets = ref['metatarsals']
        nearest = min(range(5), key=lambda i: abs(l-mets[i]['head_fl'][1]))
        hf, hl = mets[nearest]['head_fl']
        if f > hf+cfg['toe_start_margin']:
            # Phalangeal territories use actual toe axes. No toe-tip pathology is invented.
            toe = min(range(5), key=lambda i: (l-ref['toes'][i]['fl'][1])**2+(f-ref['toes'][i]['fl'][0])**2*.15)
            return entry(cfg['toe_targets'][0 if toe==0 else 1],side)
        if abs(f-hf)<cfg['head_radius'][0] and abs(l-hl)<cfg['head_radius'][1]:
            return entry('AF-R-012' if nearest==0 else 'AF-R-011',side)
        # The head band joins the MTP joint to its phalangeal territory.
        if f > hf-cfg['head_radius'][0]:
            return entry(cfg['toe_targets'][0 if nearest==0 else 1],side)
        if plantar:
            return entry('AF-R-008',side)
        nf,nl=ref['navicular']['fl']
        if lateral_normal<cfg['medial_normal'] and cfg['navicular_y'][0]<=p[1]<=cfg['navicular_y'][1] and normal[1]<cfg['side_max_up_normal'] and abs(f-nf)<cfg['navicular_radius'][0] and abs(l-nl)<cfg['navicular_radius'][1]:
            return entry('AF-R-009',side)
        bf,bl=mets[4]['base_fl']
        if lateral_normal>cfg['lateral_normal'] and f<bf+cfg['fifth_base_front_margin']:
            return entry('AF-R-010',side)
        return entry('AF-R-007',side)

    def classify(p, normal):
        side = 'left' if p[0]>0 else 'right'
        y, x = p[1], abs(p[0])
        if calf_cfg['y_range'][0]<=y<=calf_cfg['y_range'][1] and .015<x<.18:
            return chart_target(calf_cfg,charts[side],p,side)
        knee=config['knee_chart']
        if knee['y_range'][0]<=y<=knee['y_range'][1] and .015<x<.18:
            return chart_target(knee,knee_charts[side],p,side)
        thigh=config['thigh_chart']
        if thigh['y_range'][0]<=y<=thigh['y_range'][1] and thigh['abs_x'][0]<x<thigh['abs_x'][1]:
            return chart_target(thigh,thigh_charts[side],p,side)
        foot=config['foot_chart']
        if foot['y_range'][0]<=y<=foot['y_range'][1] and foot['abs_x'][0]<x<foot['abs_x'][1] and foot['z_range'][0]<=p[2]<=foot['z_range'][1]:
            return foot_target(p,normal,side)
        return 0

    nodes=[]
    max_depth=config['subdivision']['max_depth']
    min_edge=config['subdivision']['boundary_edge_m']
    refined=0
    max_boundary_edge=0

    def bake(tri, normal, depth=0):
        nonlocal max_boundary_edge
        a,b,c=tri
        ab,bc,ca=midpoint(a,b),midpoint(b,c),midpoint(c,a)
        center=tuple((x+y+z)/3 for x,y,z in zip(a,b,c))
        samples=[classify(p,normal) for p in (a,b,c,ab,bc,ca,center)]
        edge=max(math.dist(a,b),math.dist(b,c),math.dist(c,a))
        if len(set(samples))==1:
            return samples[0]
        if depth>=max_depth or edge<=min_edge:
            max_boundary_edge=max(max_boundary_edge,edge)
            return samples[-1]
        children=[bake(t,normal,depth+1) for t in ((a,ab,ca),(ab,b,bc),(ca,bc,c),(ab,bc,ca))]
        if len(set(children))==1 and children[0]>=0:
            return children[0]
        offset=len(nodes)
        nodes.extend(children)
        return -(offset+1)

    roots=[]
    for face,tri in enumerate(skin_tris):
        indices=struct.unpack_from('<3I',skin_bytes,skin_info['indices']+face*12)
        normals=[struct.unpack_from('<3h',skin_bytes,skin_info['normals']+i*6) for i in indices]
        normal=mean(normals)
        norm=math.sqrt(sum(v*v for v in normal)) or 1
        normal=[v/norm for v in normal]
        node=bake(tri,normal)
        roots.append(node)
        refined+=node<0
    gesture_groups=[]
    for group in config['gesture_groups']:
        targets={side:entries[entry(group['target'],side)] for side in ('left','right')}
        gesture_groups.append({**group,'targets':targets})
    raw=struct.pack(f'<{len(roots)+len(nodes)}i',*(roots+nodes))
    metadata={'version':1,'mesh_sha256':skin_hash,'face_count':len(roots),'roots_offset':0,
              'nodes_offset':len(roots)*4,'node_count':len(nodes),'byte_length':len(raw),
              'entries':entries,'subdivision':config['subdivision'],'gesture_groups':gesture_groups}
    report={'version':1,'mesh_sha256':skin_hash,'bone_position_hashes':bone_hashes,
            'face_count':len(roots),'refined_faces':refined,'branch_children':len(nodes),
            'atlas_bytes':len(raw),'max_boundary_leaf_edge_m':max_boundary_edge,
            'charts':charts,'knee_charts':knee_charts,'thigh_charts':thigh_charts,
            'patella_references':patella_refs,'foot_landmarks':foot_landmarks,'entries':entries,
            'note':'Surface location annotations, not deep-tissue identification or a clinical accuracy estimate.'}
    return raw,metadata,report
