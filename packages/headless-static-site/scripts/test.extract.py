import hss

hss.meta(
    name='Python extract!',
    types=['Manifest'],
    cacheKey='behavior_python',
)

data = hss.getData()
output = hss.getOutput()

if identifier := data.get("resource", {}).get("behavior"):
    hss.log(f'Found behavior {identifier}')
    hss.setMeta('behavior_python', identifier)

hss.setCache('behavior_python', True)

hss.writeOutput()
