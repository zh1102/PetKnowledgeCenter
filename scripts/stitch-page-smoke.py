"""宠物学堂两页 Stitch 实测：使用正式参考稿，未知写结果不重试，不输出密钥或签名地址。"""
import json
import os
import re
import sys
from pathlib import Path

PLUGIN = Path('C:/Users/Administrator.DESKTOP-0ALURMI/.codex/plugins/cache/partme-ai-stitch/stitch-design/0.7.8')
sys.path.insert(0, str(PLUGIN))
from stitch_harness.mcp_proxy import McpHttpSession, PROTOCOL_VERSION
from stitch_harness.secrets import platform_secret_provider

ROOT = Path('D:/ZH/宠物学堂')
OUT = ROOT / '资产/UI/Stitch-两页实测-20260916'
STATE = OUT / 'test-state.json'
FILES = {
    'today': 'child-today-ipad-landscape-simple-v4-official-pet.png',
    'p22': 'child-p22-reading-checkin-ipad-simple-v2-official-pet.png',
}

def unpack(result):
    # MCP 可使用 structuredContent 或 JSON 文本返回，统一读取且不打印完整响应。
    if result.get('isError'):
        raise RuntimeError('Stitch returned isError; no write retry performed')
    if isinstance(result.get('structuredContent'), dict):
        return result['structuredContent']
    for content in result.get('content', []):
        if content.get('type') == 'text':
            try:
                return json.loads(content['text'])
            except (ValueError, KeyError):
                pass
    return result

def screens(value):
    # 只提取经过资源格式核验的屏幕身份，签名 URL 不进入本地状态与日志。
    found = []
    if isinstance(value, dict):
        name = value.get('name', '')
        if re.fullmatch(r'projects/[0-9]+/screens/[A-Za-z0-9_-]+', name):
            found.append(name)
        for child in value.values():
            found.extend(screens(child))
    elif isinstance(value, list):
        for child in value:
            found.extend(screens(child))
    return sorted(set(found))

def main():
    os.environ['HTTPS_PROXY'] = 'http://127.0.0.1:7890'
    os.environ['HTTP_PROXY'] = 'http://127.0.0.1:7890'
    OUT.mkdir(parents=True, exist_ok=True)
    state = json.loads(STATE.read_text('utf-8')) if STATE.exists() else {'references': {}, 'generated': {}}
    session = McpHttpSession(platform_secret_provider(), timeout=300)
    identifier = 0

    def request(method, params):
        nonlocal identifier
        identifier += 1
        messages = session.send({'jsonrpc': '2.0', 'id': identifier, 'method': method, 'params': params})
        matching = [m for m in messages if m.get('id') == identifier]
        if len(matching) != 1 or 'error' in matching[0]:
            raise RuntimeError('Invalid or failed MCP response; no write retry performed')
        return matching[0]['result']

    def call(name, arguments):
        print('CALL', name, flush=True)
        return unpack(request('tools/call', {'name': name, 'arguments': arguments}))

    def save():
        # 状态仅保留身份与验收值；阶段失败时不会自动重复非幂等写入。
        STATE.write_text(json.dumps(state, ensure_ascii=False, indent=2), 'utf-8')

    request('initialize', {'protocolVersion': PROTOCOL_VERSION, 'capabilities': {}, 'clientInfo': {'name': 'pet-school-test', 'version': '1'}})
    session.send({'jsonrpc': '2.0', 'method': 'notifications/initialized'})
    catalog = request('tools/list', {})
    print('TOOLS', len(catalog.get('tools', [])), flush=True)
    mode = sys.argv[1] if len(sys.argv) > 1 else 'prepare'

    if mode == 'prepare':
        if not state.get('projectId'):
            state['pendingWrite'] = 'create_project'
            save()
            project = call('create_project', {'title': '宠物学堂-今日任务与P22-iPad实测-20260916'})
            name = project.get('name') or project.get('project', {}).get('name')
            if not isinstance(name, str) or not re.fullmatch(r'projects/[0-9]+', name):
                raise RuntimeError('No verified project identity')
            state['projectId'] = name.split('/')[-1]
            state.pop('pendingWrite', None)
            save()
        for key, filename in FILES.items():
            if key in state['references']:
                continue
            state['pendingWrite'] = 'upload_' + key
            save()
            uploaded = call('stitch_local_upload_asset', {'projectId': state['projectId'], 'filePath': str(ROOT / '资产/UI' / filename), 'title': key + '-已确认参考稿', 'createScreenInstances': True})
            names = screens(uploaded)
            if len(names) != 1:
                raise RuntimeError('Upload did not return exactly one verified screen')
            state['references'][key] = names[0]
            state.pop('pendingWrite', None)
            save()
            print('REFERENCE_READY', key, names[0], flush=True)
    elif mode == 'diagnostic-export':
        # 设备门失败后仅下载既有样本用于分析，不再生成或修改任何远程页面。
        download = call('stitch_local_download_assets', {'projectId': state['projectId'], 'outputDir': str(OUT), 'assetsSubdir': 'today-diagnostic-export', 'screenNames': [state['generated']['today']], 'referencedAssetPolicy': 'best_effort'})
        print('DIAGNOSTIC_EXPORTED', download.get('count'), 'files; warnings', len(download.get('warnings', [])), flush=True)
    elif mode in FILES:
        if state.get('pendingWrite'):
            raise RuntimeError('Unreconciled pending write; read state before retry')
        if mode not in state['generated']:
            context = '[Context] Rebuild the selected approved screenshot as editable HTML UI, not a flattened full-page image. Chinese children learning app 宠物学堂. iPad landscape TABLET canvas exactly 1448x1086. This is a visual test, not production. Preserve the screenshot style and supplied pet, logo and icons; do not invent a replacement pet.'
            layout = '[Layout] 1. Keep fixed pale-lavender left navigation, cream content background, dark-brown Chinese text and purple buttons. 2. Keep original positions, rounded white cards and a single soft shadow. 3. Reuse screenshot illustration as an image asset; rebuild text, cards, buttons and form controls as HTML nodes.'
            if mode == 'today':
                components = '[Components] Title 今天的任务. Five tasks: 阅读打卡 已完成; 英语打卡 已完成; 三米打卡 待家长确认; 数学天天练 已完成; 讲数学题 去完成. Confirmed progress 3/5. Daily gift button disabled, label 还差2项 (correct original screenshot error 还差1项). Parent-reviewed tasks count only after confirmation. All five confirmed tasks unlock one daily gift; never reward individual tasks. 20 stars is demo display only. Preserve selected 今日任务 navigation.'
            else:
                components = '[Components] Title 阅读打卡, subtitle 安静读一会儿，再告诉家长你读了什么。 Goal 今日目标·10分钟, completed timer 10:00/10:00. Optional editable inputs 书名（选填） 小熊和月亮 and 读到哪里（选填） 第12页. No photo required. Buttons 稍后继续 and 提交阅读打卡. Note 提交后请家长确认。单项完成只增加今日进度，不会立即获得星星。 Keep same navigation and original illustration.'
            state['pendingWrite'] = 'edit_' + mode
            save()
            result = call('edit_screens', {'projectId': state['projectId'], 'selectedScreenIds': [state['references'][mode].split('/')[-1]], 'deviceType': 'TABLET', 'prompt': '\n'.join([context, layout, components])})
            names = screens(result)
            if len(names) != 1:
                # 无唯一屏幕时保留未知结果标记，交由只读对账，禁止猜测生成成功。
                print('RESULT_KEYS', list(result.keys()), flush=True)
                raise RuntimeError('Generation result needs read reconciliation')
            state['generated'][mode] = names[0]
            state.pop('pendingWrite', None)
            save()
        detail = call('get_screen', {'name': state['generated'][mode]})
        detail = detail.get('screen', detail)
        validation = {k: detail.get(k) for k in ['name', 'title', 'deviceType', 'width', 'height', 'screenType']}
        state.setdefault('validation', {})[mode] = validation
        save()
        print('VALIDATION', json.dumps(validation, ensure_ascii=False), flush=True)
        width, height = int(detail.get('width', 0)), int(detail.get('height', 0))
        if detail.get('deviceType') != 'TABLET' or width % 1448 or height % 1086 or width // 1448 != height // 1086 or width == 0:
            print('DEVICE_GATE_FAILED: stop further generation', flush=True)
            return 2
        download = call('stitch_local_download_assets', {'projectId': state['projectId'], 'outputDir': str(OUT), 'assetsSubdir': mode + '-export', 'screenNames': [state['generated'][mode]], 'referencedAssetPolicy': 'best_effort'})
        print('EXPORTED', download.get('count'), 'files; warnings', len(download.get('warnings', [])), flush=True)
    print('STATE', STATE, flush=True)
    return 0

if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as error:
        # 只输出安全的异常类型，防止底层响应携带凭据或下载签名。
        print('FAILED', type(error).__name__, str(error) if isinstance(error, RuntimeError) else 'see pending stage; no retry', flush=True)
        sys.exit(1)
