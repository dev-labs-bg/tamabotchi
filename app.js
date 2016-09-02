const express = require('express');

const config = require('./config.json');
const models = require('./models.js');
const tamabotchi = require('./tamabotchi.js');

let expressApp = express();
expressApp.use(express.static('public'));
expressApp.listen(config.WEB.PORT);

//models.init_models();
tamabotchi.setupServer();

