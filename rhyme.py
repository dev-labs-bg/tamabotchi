from urllib import request
import random
import string
import json

def datamuse(endpoint = 'words', **kwargs):
    urlAddress = 'http://api.datamuse.com/' + endpoint
    sepChar = '?'

    for key, value in kwargs.items():
        urlAddress += '{}{}={}'.format(sepChar, key, value)
        sepChar = '&'

    jsonText = request.urlopen(urlAddress).read()
    return json.loads(jsonText.decode())

#lineStr = ['I am a cool coder', 'You type slow']

exclude = set(string.punctuation)
def clean(s):
    s = s.lower()
    return ''.join(c for c in s if not c in exclude)

while True:
    lineStr = []
    lineWord = []
    for i in range(2):
        lineStr.append(clean(input()))

    for s in lineStr:
        lineWord.append(s.split(' '))

    print(lineStr[0])

    qArgs = {}
    qArgs['rel_rhy'] = lineWord[0][-1]
    qArgs['ml'] = lineWord[1][-1]
    if len(lineWord[1]) > 1:
            qArgs['lc'] = lineWord[1][-2]
    
    subt = datamuse(**qArgs)
    if not subt:
        del qArgs['ml']
        subt = datamuse(**qArgs)

    if subt:
        print(' '.join(lineWord[1][:-1] + [clean(subt[0]['word'])]))
    else:
        print(lineStr[1])
