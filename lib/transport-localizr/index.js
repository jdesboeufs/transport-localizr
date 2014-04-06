/*
** Module dependencies
*/
var express = require('express');
var Q = require('q');
var _ = require('lodash');
var mongodb = require('mongodb');

/*
** MongoDB connection
*/
var client = mongodb.MongoClient;
var connectionString = process.env.MONGODB_URL || 'mongodb://localhost/transport-localizr';

function collectionReset() {
    var deferred = Q.defer();

    client.connect(connectionString, function(err, db) {
        if (err) return deferred.reject(err);

        var collection = db.collection('localizr-stations');
        collection.remove(function(err) {
            if (err) return deferred.reject(err);
            console.log('All previous elements removed!');

            collection.ensureIndex({ loc: '2dsphere' }, function(err) {
                if (err) return deferred.reject(err);
                deferred.resolve(collection);
            });
        });
    });

    return deferred.promise;
}

/*
** Prepare dataset
*/
var grandparisProviders = require('../transport-localizr-grandparis');

function datasetReady() {
    var dataset = {};

    return Q.all([
        grandparisProviders.sncf(dataset),
        grandparisProviders.ratp(dataset),
        grandparisProviders.velib(dataset),
        grandparisProviders.autolib(dataset)
    ]).then(function() {
        return dataset;
    });
}

/*
** Load dataset into collection
*/
function loadDataset(result) {
    var deferred = Q.defer();
    var collection = result[0];
    var dataset = result[1];

    collection.insert(_.values(dataset), { continueOnError: true }, function(err) {
        if (err) return deferred.reject(err);
        else deferred.resolve(collection);
    });

    return deferred.promise;
}

/*
** Workflow
*/
var collectionReady = Q.all([collectionReset(), datasetReady()]).then(loadDataset);

collectionReady.then(function() {
    console.log('Database ready!');
}, function(err) {
    console.log(err);
});

/*
** Express app
*/
var app = module.exports = express();

function injectCollection(req, res, next) {
    collectionReady.then(function(collection) {
        req.collection = collection;
        next();
    }, function(reason) {
        next(reason);
    });
}

function cleanParams(req, res, next) {
    if (!('lat' in req.query) || !('lon' in req.query)) return res.send(400);
    req.lat = parseFloat(req.query.lat);
    req.lon = parseFloat(req.query.lon);
    if (_.isNaN(req.lat) || req.lat < -90 || req.lat > 90) return res.send(400);
    if (_.isNaN(req.lon) || req.lon < -180 || req.lon > 180) return res.send(400);
    if ('dist' in req.query) {
        req.dist = parseInt(req.query.dist);
        if (_.isNaN(req.dist) || req.dist <= 0 || req.dist > 10000) return res.send(400);
    }
    next();
}

app.get('/search', injectCollection, cleanParams, function(req, res, next) {
    req.collection.aggregate([
        {
            $geoNear: {
                near: { type: 'Point', coordinates: [req.lon, req.lat] },
                distanceField: 'distance',
                maxDistance: req.dist || 300,
                spherical: true
            }
        }
    ], function(err, results) {
        if (err) return next(err);
        res.send(results);
    });
});
