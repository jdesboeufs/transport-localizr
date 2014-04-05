var csv = require('csv');
var Q = require('q');
var request = require('request');

function parseRemoteCsv(url, onRecord, options) {
    var deferred = Q.defer();

    csv()
        .from.stream((request(url)), options)
        .on('record', onRecord)
        .on('error', function (error) { deferred.reject(error); })
        .on('end', function(count) { deferred.resolve(count); });

    return deferred.promise;
}

module.exports = function(dataset) {

    function ensureExists(dataset, key) {
        if (!(key in dataset)) dataset[key] = { _id: key, provider: 'autolib' };
    }

    var autolibParsed = parseRemoteCsv(
        'http://data.iledefrance.fr/explore/dataset/stations_et_espaces_autolib/download?format=csv',
        function(row) {
            var key = 'autolib#' + row.identifiant_dsp;
            ensureExists(dataset, key);
            var coords = row.field13.split(', ');
            dataset[key].loc = { type: 'Point', coordinates: [parseFloat(coords[1]), parseFloat(coords[0])] };
            dataset[key].name = row.nom_de_la_station;
        },
        {
            delimiter: ';',
            columns: true
        }
    );

    autolibParsed.then(function(count) {
        console.log('Autolib loaded', count);
    });

    return autolibParsed;

};
