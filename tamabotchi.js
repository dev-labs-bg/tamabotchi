const {Wit, log} = require('node-wit');
const messenger = require('./messenger-api.js');
const conf = require('./config.json');

const actions = {
    send: messenger.send,
    list_categories: (request) => {
        request.context.quickreplies = ['aplha', 'bravo', 'charlie'];
        return Promise.resolve(request.context);
    }
};
const client = new Wit({
    accessToken: conf.wit_access_token,
    actions: actions
});


const server = messenger.get_messenger_wit_server(client);
server.listen(8000, () => {});

