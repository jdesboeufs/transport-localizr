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
        if (!(key in dataset)) dataset[key] = { _id: key, lines: [], provider: 'sncf' };
    }

    var sncfLignesParsed = parseRemoteCsv(
        'http://ressources.data.sncf.com/explore/dataset/sncf-lignes-par-gares-idf/download?format=csv',
        function(row) {
            var key = 'sncf#' + row.code_uic;
            ensureExists(dataset, key);
            var lines = dataset[key].lines;

            function checkCodeAndInsert(code, name, type) {
                if (row[code] === '1') lines.push({ code: code.toUpperCase(), name: name, type: type });
            }

            checkCodeAndInsert('a', 'RER A', 'rer');
            checkCodeAndInsert('b', 'RER B', 'rer');
            checkCodeAndInsert('c', 'RER C', 'rer');
            checkCodeAndInsert('d', 'RER D', 'rer');
            checkCodeAndInsert('e', 'RER E', 'rer');
            checkCodeAndInsert('h', 'Ligne H', 'train');
            checkCodeAndInsert('j', 'Ligne J', 'train');
            checkCodeAndInsert('k', 'Ligne K', 'train');
            checkCodeAndInsert('l', 'Ligne L', 'train');
            checkCodeAndInsert('n', 'Ligne N', 'train');
            checkCodeAndInsert('p', 'Ligne P', 'train');
            checkCodeAndInsert('r', 'Ligne R', 'train');
            checkCodeAndInsert('u', 'Ligne U', 'train');
        },
        {
            delimiter: ';',
            columns: true
        }
    );

    var sncfArretsParsed = parseRemoteCsv(
        'http://ressources.data.sncf.com/explore/dataset/sncf-gares-et-arrets-transilien-ile-de-france/download?format=csv',
        function(row) {
            var key = 'sncf#' + row.code_uic;
            ensureExists(dataset, key);
            var coords = row.coord_gps_wgs84.split(', ');
            dataset[key].loc = { type: 'Point', coordinates: [parseFloat(coords[1]), parseFloat(coords[0])] };
            dataset[key].name = row.nom_gare;
        },
        {
            delimiter: ';',
            columns: true
        }
    );

    sncfLignesParsed.then(function(count) {
        console.log('SNCF Lignes loaded', count);
    });

    sncfArretsParsed.then(function(count) {
        console.log('SNCF Arrêts loaded', count);
    });

    return Q.all([sncfLignesParsed, sncfArretsParsed]);

};
