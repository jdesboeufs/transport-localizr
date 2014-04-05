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
        if (!(key in dataset)) dataset[key] = { _id: key, provider: 'velib' };
    }

    var velibParsed = module.exports = parseRemoteCsv(
        'http://data.iledefrance.fr/explore/dataset/velib_a_paris_et_communes_limitrophes/download?format=csv',
        function(row) {
            var key = 'velib#' + row.number;
            ensureExists(dataset, key);
            dataset[key].loc = { type: 'Point', coordinates: [parseFloat(row.longitude), parseFloat(row.latitude)] };
            dataset[key].name = row.name;
        },
        {
            delimiter: ';',
            columns: true
        }
    );

    velibParsed.then(function(count) {
        console.log('Vélib loaded', count);
    });

};
