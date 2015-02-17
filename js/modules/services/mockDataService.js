/**=========================================================
* Module: Graph
* Visualizer for force directed graph
=========================================================*/
(function() {
  'use strict';

    var mockDataService = function MockDataService() {
      var MOCK_SAMPLE_DATA = [
      {
        'name' : 'Show All Types', 
        'data' : {
          "nodes": [
          {
            "name": "service: guestbook",
            "group": 1,
            "radius": 16
          }, 
          {
            "name": "pod: guestbook-controller",
            "group": 2,
            "radius": 20
          }, 
          {
            "name": "pod: guestbook-controller",
            "group": 2,
            "radius": 20
          }, 
          {
            "name": "pod: guestbook-controller",
            "group": 2,
            "radius": 20
          }, 
          {
            "name": "container: php-redis",
            "group": 3,
            "radius": 24
          }, 
          {
            "name": "container: php-redis",
            "group": 3,
            "radius": 24
          }, 
          {
            "name": "container: php-redis",
            "group": 3,
            "radius": 24
          }, 
          {
            "name": "service: redis-master",
            "group": 1,
            "radius": 16,
            "tags": [
              {
                "key": "Type",
                "value": "Service"
              },
              {
                "key": "Console",
                "value": "http://localhost:5678/some/console",
                "type": "link",
                "hide": false
              }
            ]
          },
          {
            "name": "pod: redis-master",
            "group": 2,
            "radius": 20
          }, 
          {
            "name": "container: master",
            "group": 3,
            "radius": 24
          },
          {
            "name": "lb: guestbook",
            "group": 4,
            "radius": 16,
            "tags": [
              {
                "key": "Type",
                "value": "Load Balancer"
              },
              {
                "key": "Port",
                "value": "3000"
              },
              {
                "key": "Logs",
                "value": "http://localhost:1234/some/logs",
                "type": "link",
                "hide": false
              },
              {
                "key": "More Logs",
                "value": "http://localhost:9012/more/logs",
                "type": "link",
                "hide": true
              }
            ]
          },
          {
            "name": "service: redis-worker",
            "group": 1,
            "radius": 16
          }, 
          {
            "name": "pod: redis-worker-controller",
            "group": 2,
            "radius": 20
          }, 
          {
            "name": "container: slave",
            "group": 3,
            "radius": 24
          }, 
          {
            "name": "container: slave",
            "group": 3,
            "radius": 24
          }
          ],
          "links": [
          {
            "source": 0,
            "target": 1,
            "thickness": 2,
            "distance": 80
          }, 
          {
            "source": 0,
            "target": 2,
            "thickness": 2,
            "distance": 80
          }, 
          {
            "source": 0,
            "target": 3,
            "thickness": 2,
            "distance": 80
          }, 
          {
            "source": 1,
            "target": 4,
            "thickness": 1,
            "distance": 80
          }, 
          {
            "source": 2,
            "target": 5,
            "thickness": 1,
            "distance": 80
          }, 
          {
            "source": 3,
            "target": 6,
            "thickness": 1,
            "distance": 80
          }, 
          {
            "source": 7,
            "target": 8,
            "thickness": 2,
            "distance": 80
          }, 
          {
            "source": 8,
            "target": 9,
            "thickness": 1,
            "distance": 80
          }, 
          {
            "source": 10,
            "target": 0,
            "thickness": 3,
            "distance": 80,
            "label": "port: 3000"
          }, 
          {
            "source": 11,
            "target": 12,
            "thickness": 2,
            "distance": 80
          }, 
          {
            "source": 12,
            "target": 13,
            "thickness": 1,
            "distance": 80
          }, 
          {
            "source": 12,
            "target": 14,
            "thickness": 1,
            "distance": 80
          },
          ],
          "settings": {
            "clustered": false,
            "showEdgeLabels": true,
            "showNodeLabels": true
          }
        }
      },
      {
        'name' : 'Hide Containers',
        'data' : {
          "nodes": [
          {
            "name": "service: guestbook",
            "group": 1,
            "radius": 16
          },
          {
            "name": "pod: guestbook-controller",
            "group": 2,
            "radius": 20
          },
          {
            "name": "pod: guestbook-controller",
            "group": 2,
            "radius": 20
          },
          {
            "name": "pod: guestbook-controller",
            "group": 2,
            "radius": 20
          },
          {
            "name": "service: redis-master",
            "group": 1,
            "radius": 16
          },
          {
            "name": "pod: redis-master",
            "group": 2,
            "radius": 20
          },
          {
            "name": "service: redis-worker",
            "group": 1,
            "radius": 16
          },
          {
            "name": "pod: redis-worker-controller",
            "group": 2,
            "radius": 20
          },
          {
            "name": "pod: redis-worker-controller",
            "group": 2,
            "radius": 20
          },
          {
            "name": "load balancer: guestbook",
            "group": 3,
            "radius": 16
          }
          ],
          "links": [
          {
            "source": 0,
            "target": 1,
            "thickness": 2,
            "distance": 80
          },
          {
            "source": 0,
            "target": 2,
            "thickness": 2,
            "distance": 80
          },
          {
            "source": 0,
            "target": 3,
            "thickness": 2,
            "distance": 80
          },
          {
            "source": 9,
            "target": 0,
            "thickness": 3,
            "distance": 80,
            "label": "port: 3000"
          },
          {
            "source": 4,
            "target": 5,
            "thickness": 2,
            "distance": 80
          },
          {
            "source": 6,
            "target": 7,
            "thickness": 2,
            "distance": 80
          },
          {
            "source": 6,
            "target": 8,
            "thickness": 2,
            "distance": 80
          },
          {
            "source": 7,
            "target": 4,
            "thickness": 4,
            "distance": 80,
            "dashes": true
          },
          {
            "source": 8,
            "target": 4,
            "thickness": 4,
            "distance": 80,
            "dashes": true
          },
          {
            "source": 1,
            "target": 4,
            "thickness": 4,
            "distance": 80,
            "dashes": true
          },
          {
            "source": 2,
            "target": 4,
            "thickness": 4,
            "distance": 80,
            "dashes": true
          },
          {
            "source": 3,
            "target": 4,
            "thickness": 4,
            "distance": 80,
            "dashes": true
          },
          {
            "source": 1,
            "target": 6,
            "thickness": 4,
            "distance": 80,
            "dashes": true
          },
          {
            "source": 2,
            "target": 6,
            "thickness": 4,
            "distance": 80,
            "dashes": true
          },
          {
            "source": 3,
            "target": 6,
            "thickness": 4,
            "distance": 80,
            "dashes": true
          }
          ],
          "settings": {
            "clustered": false,
            "showEdgeLabels": true,
            "showNodeLabels": true
          }
        }
      },
      {
      'name' : 'Clustered',
      'data' : {
        "nodes" : [ 
        {
          "group" : 1,
          "name" : "pod: guestbook-controller",
          "radius" : 24
        },
        { 
          "group" : 2,
          "name" : "pod: guestbook-controller",
          "radius" : 24
        },
        { 
          "group" : 3,
          "name" : "pod: guestbook-controller",
          "radius" : 24
        },
        { 
          "group" : 1,
          "name" : "container: php-redis",
          "radius" : 20
        },
        { 
          "group" : 2,
          "name" : "container: php-redis",
          "radius" : 20
        },
        { 
          "group" : 3,
          "name" : "container: php-redis",
          "radius" : 20
        },
        { 
          "group" : 4,
          "name" : "pod: redis-master",
          "radius" : 24
        },
        { 
          "group" : 4,
          "name" : "container: master",
          "radius" : 20
        },
        { 
          "group" : 5,
          "name" : "pod: redis-worker-controller",
          "radius" : 24
        },
        { 
          "group" : 5,
          "name" : "container: slave",
          "radius" : 20
        },
        { 
          "group" : 5,
          "name" : "container: slave",
          "radius" : 20
        }
        ],
        "settings" : { 
          "clusterSettings" : { 
            "clusterPadding" : 25,
            "padding" : 1.5
          },
          "clustered" : true,
          "showEdgeLabels" : true,
          "showNodeLabels" : true
        }
      }
    }];

    return {
      samples : MOCK_SAMPLE_DATA
    };
  };

  angular.module('krakenApp.Graph')
  .service('mockDataService', mockDataService);

})();
