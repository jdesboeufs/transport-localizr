var csv = require('csv');
var Q = require('q');
var request = require('request');
var _s = require('underscore.string');

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
        if (!(key in dataset)) dataset[key] = { _id: key, lines: [], provider: 'ratp' };
    }

    var ratpArretLigneParsed = parseRemoteCsv(
        'http://data.ratp.fr/?eID=ics_od_datastoredownload&file=60',
        function(row) {
            if (row.lineType !== 'rer') {
                var key = 'ratp#' + row.stop;
                ensureExists(dataset, key);
                dataset[key].lines.push({
                    code: _s.strLeft(row.line, ' '),
                    name: _s.trim(_s.strRight(row.line, ' '), '()'),
                    type: row.lineType,
                    originalName: row.line
                });
            }
        },
        {
            delimiter: '#',
            columns: ['stop', 'line', 'lineType']
        }
    );

    var ratpArretGraphiqueParsed = parseRemoteCsv(
        'http://data.ratp.fr/?eID=ics_od_datastoredownload&file=64',
        function(row) {
            if (row.type !== 'rer') {
                var key = 'ratp#' + row.stop;
                if (row.lon > 60) return console.log('Dropping: ', row);
                ensureExists(dataset, key);
                dataset[key].loc = { type: 'Point', coordinates: [parseFloat(row.lon), parseFloat(row.lat)] };
                dataset[key].name = row.name;
            }
        },
        {
            delimiter: '#',
            columns: ['stop', 'lon', 'lat', 'name', 'town', 'type']
        }
    );

    ratpArretLigneParsed.then(function(count) {
        console.log('RATP Lignes loaded', count);
    });

    ratpArretGraphiqueParsed.then(function(count) {
        console.log('RATP Arrêts loaded', count);
    });

    return Q.all([ratpArretLigneParsed, ratpArretGraphiqueParsed]);

};
