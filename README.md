transport-localizr
==================

## Roadmap

* Extract MongoDB adapter
* Extract GrandParis dataset builder
* Remove express dependency
* Tests

## API

### Request

`GET /search?lat=XXXXXX&lon=YYYYYY&dist=500"`

### Response

```javascript
[
    {
        "name": "Nation",
        "loc": {
            "type": "Point",
            "coordinates": [2, 40]
        }
        "distance": 45.0377748,
        "lines": [
            { "code": "1", "name": "LA DÉFENSE - CHÂTEAU DE VINCENNES", "type": "metro" },
            { "code": "6", "name": "NATION - ÉTOILE", "type": "metro" }
        ]
    },
    {
        "name": "Avron",
        "lines": [
            { "code": "6", "name": "NATION - Étoile", "type": "metro" }
        ]
    },
    {
        "name": "Une station de bus",
        "lines": [
            { "code": "123", "name": "Une ligne de bus", "type": "bus" }
        ]
    },
    {
        "name": "Nation",
        "lines": [
            { "code": "A", "type": "rer" }
        ]
    },
    {
        "name": "Pont du Garigliano",
        "lines": [
            { "code": "T6", "type": "tram" }
        ]
    },
    {
        "name": "Un gare Transilien",
        "lines": [
            { "code": "T6", "type": "train" }
        ]
    },
    {
        "name": "Place de Clichy/17",
        "type": "autolib"
    },
    {
        "name": "123455",
        "type": "velib"
    }
]
```
