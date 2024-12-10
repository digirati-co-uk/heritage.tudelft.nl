import sys, json;

def meta(name, types, cacheKey):
    if len(sys.argv) == 2 and sys.argv[1] == "--meta":
        sys.stdout.write(json.dumps({
            'name': name,
            'types': types or [],
            'cacheKey': cacheKey or '',
        }))
        sys.exit(0)


def getData():
    return json.load(sys.stdin)

output = {
    'meta': {},
    'caches': {},
    'logs': []
}

def log(message):
    output['logs'].append(message)

def getOutput():
    return output

def setMeta(key, value):
    output['meta'][key] = value

def setCache(key, value):
    output['caches'][key] = value

def writeOutput():
    sys.stdout.write(json.dumps(output));
