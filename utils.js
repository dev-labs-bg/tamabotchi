'use strict'
const request = require('request-promise-native');
const htmlparser2 = require('htmlparser2');

function getWikiarticlePlain(title) {
    const API_ENDPOINT = 'https://en.wikipedia.org/w/api.php';
    let baseURL = `${API_ENDPOINT}?action=parse&format=json&prop=text&page=${title}`;

    return request(baseURL).then(body => {
        let plaintext = '';
        let blacklistClasses = new Set(['reference', 'mw-editsection']);
        let topLevelTags = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5']);
        //let keepTags = new Set(['b', 'em', 'strong'])

        //console.log(body)

        let handler = new htmlparser2.DomHandler((err, dom) => {
            let reachedEnd = false;
            //console.log(dom)
            for (let i = 0;i < dom.length;i++) {
                let el = dom[i];

                if ((el.type == 'tag') && (topLevelTags.has(el.name))) {
                    let curAns = '';

                    (function recurse_add(el) {
                        if (el.type == 'text') {
                            curAns += el.data;
                        } else {
                            if (el.attribs) {
                                if (el.attribs['id'] === 'See_also') {
                                    reachedEnd = true;
                                    return;
                                } else if (blacklistClasses.has(el.attribs['class'])) {
                                    return;
                                } 
                            } 
                            if (el.children) {
                                el.children.forEach(recurse_add);
                                if (topLevelTags.has(el.name)) {
                                    //curAns += '\n';
                                }
                            }
                        }
                        //console.log('<close>')
                    })(el);

                    if (reachedEnd) {
                        break;
                    } else if (el.name == 'p') {
                        plaintext += curAns;
                    }
                }
            }
        });
        let parser = new htmlparser2.Parser(handler);
        //console.log('parsing');
        parser.write(JSON.parse(body).parse.text['*']);
        parser.done();
        return plaintext;
    })
}

//fetches the whole database from http://opentdb.com
function get_trivia_db() {
    const BASE_URL = 'http://www.opentdb.com/';
    
    return request(`${BASE_URL}api_token.php?command=request`).then(body => {
        let response = JSON.parse(body);
        if (response.response_code !== 0) {
            return Promise.reject('Error obtaining api token');
        } else {
            return response.token;
        }
    }).then(token => {
        let queryUrl = `${BASE_URL}api.php?amount=50&token=${token}`;

        return (function fetch_questions() {
            return request(queryUrl).then(body => {
                let resp = JSON.parse(body),
                    code = resp.response_code;
                //console.log('Fetched: ', resp.results.length);
                if (code === 4) {
                    return Promise.resolve([]);
                } else if ((code === 0) || (code == 1)) {
                    return fetch_questions().then(ans => {
                        return ans.concat(resp.results);
                    })
                } else {
                    return Promise.reject('Error fetching questions');
                }
            });
        })(token);
    })

}

get_trivia_db().then(db => {
    console.log(JSON.stringify(db))
}).catch(err => {
    console.log(err);
});
