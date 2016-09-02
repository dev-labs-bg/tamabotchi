const express = require('express');
const mongoose = require('mongoose');

const config = require('./config.json');

mongoose.Promise = global.Promise;
mongoose.connect(config.DB.MONGO_URL);

const dbsync = require('./dbsync.js');
const tamabotchi = require('./tamabotchi.js');

let expressApp = express();
expressApp.use(express.static('public'));
expressApp.listen(config.WEB.PORT);

tamabotchi.setupServer();

dbsync.scheduleSync();
