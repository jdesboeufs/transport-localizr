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

app.get('/search', injectCollection, function(req, res, next) {
    req.collection.aggregate([
        {
            $geoNear: {
                near: { type: 'Point', coordinates: [parseFloat(req.query.lon) , parseFloat(req.query.lat)] },
                distanceField: 'distance',
                maxDistance: parseInt(req.query.dist || 300),
                spherical: true
            }
        }
    ], function(err, results) {
        if (err) return next(err);
        res.send(results);
    });
});
