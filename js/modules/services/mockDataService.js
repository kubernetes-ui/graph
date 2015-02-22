/**=========================================================
* Module: Graph
* Visualizer for force directed graph
=========================================================*/
(function() {
  'use strict';

    var mockDataService = function MockDataService() {
      var MOCK_SAMPLE_DATA = [
      {
        'name' : 'All Types', 
        'data' : {
          "nodes": [
          {
            "name": "service: guestbook",
            "radius": 16,
            "fill": "olivedrab",
            "id": 1,
            "selected": true
          }, 
          {
            "name": "pod: guestbook-controller",
            "radius": 20,
            "fill": "palegoldenrod",
            "id": 2,
            "selected": true
          }, 
          {
            "name": "pod: guestbook-controller",
            "radius": 20,
            "fill": "palegoldenrod",
            "id": 3,
            "selected": true
          },
          {
            "name": "pod: guestbook-controller",
            "radius": 20,
            "fill": "palegoldenrod"
          },
          {
            "name": "container: php-redis",
            "radius": 24,
            "fill": "cornflowerblue"
          }, 
          {
            "name": "container: php-redis",
            "radius": 24,
            "fill": "cornflowerblue"
          },
          {
            "name": "container: php-redis",
            "radius": 24,
            "fill": "cornflowerblue"
          }, 
          {
            "name": "service: redis-master",
            "radius": 16,
            "fill": "olivedrab",
            "tags": {
              "Type": "Service",
              "ContainerConfig": {"anotherKey": "anotherValue"},
              "Console": "http://localhost:5678/some/console"
            }
          },
          {
            "name": "pod: redis-master",
            "radius": 20,
            "fill": "palegoldenrod"
          },
          {
            "name": "container: master",
            "radius": 24,
            "fill": "cornflowerblue"
          },
          {
            "name": "load balancer: guestbook",
            "radius": 16,
            "fill": "yellowgreen",
            "tags": {
              "Type": "Load Balancer",
              "Port": "3000",
              "Logs": "http://localhost:1234/some/logs"
            }
          },
          {
            "name": "service: redis-worker",
            "radius": 16,
            "fill": "olivedrab"
          },
          {
            "name": "pod: redis-worker-controller",
            "radius": 20,
            "fill": "palegoldenrod"
          }, 
          {
            "name": "container: slave",
            "radius": 24,
            "fill": "cornflowerblue"
          }, 
          {
            "name": "container: slave",
            "radius": 24,
            "fill": "cornflowerblue"
          }
          ],
          "links": [
          {
            "source": 0,
            "target": 1,
            "width": 2,
            "stroke": "black",
            "distance": 80
          }, 
          {
            "source": 0,
            "target": 2,
            "width": 2,
            "stroke": "black",
            "distance": 80
          }, 
          {
            "source": 0,
            "target": 3,
            "width": 2,
            "stroke": "black",
            "distance": 80
          }, 
          {
            "source": 1,
            "target": 4,
            "width": 1,
            "stroke": "black",
            "distance": 80
          }, 
          {
            "source": 2,
            "target": 5,
            "width": 1,
            "stroke": "black",
            "distance": 80
          }, 
          {
            "source": 3,
            "target": 6,
            "width": 1,
            "stroke": "black",
            "distance": 80
          }, 
          {
            "source": 7,
            "target": 8,
            "width": 2,
            "stroke": "black",
            "distance": 80
          }, 
          {
            "source": 8,
            "target": 9,
            "width": 1,
            "stroke": "black",
            "distance": 80
          }, 
          {
            "source": 10,
            "target": 0,
            "width": 3,
            "stroke": "black",
            "distance": 80,
            "label": "port: 3000"
          }, 
          {
            "source": 11,
            "target": 12,
            "width": 2,
            "stroke": "black",
            "distance": 80
          }, 
          {
            "source": 12,
            "target": 13,
            "width": 1,
            "stroke": "black",
            "distance": 80
          }, 
          {
            "source": 12,
            "target": 14,
            "width": 1,
            "stroke": "black",
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
            "radius": 16,
            "fill": "olivedrab"
          },
          {
            "name": "pod: guestbook-controller",
            "radius": 20,
            "fill": "palegoldenrod"
          },
          {
            "name": "pod: guestbook-controller",
            "radius": 20,
            "fill": "palegoldenrod"
          },
          {
            "name": "pod: guestbook-controller",
            "radius": 20,
            "fill": "palegoldenrod"
          },
          {
            "name": "service: redis-master",
            "radius": 16,
            "fill": "olivedrab"
          },
          {
            "name": "pod: redis-master",
            "radius": 20,
            "fill": "palegoldenrod"
          },
          {
            "name": "service: redis-worker",
            "radius": 16,
            "fill": "olivedrab"
          },
          {
            "name": "pod: redis-worker-controller",
            "radius": 20,
            "fill": "palegoldenrod"
          },
          {
            "name": "pod: redis-worker-controller",
            "radius": 20,
            "fill": "palegoldenrod"
          },
          {
            "name": "load balancer: guestbook",
            "radius": 16,
            "fill": "yellowgreen"
          }
          ],
          "links": [
          {
            "source": 0,
            "target": 1,
            "width": 2,
            "stroke": "black",
            "distance": 80
          },
          {
            "source": 0,
            "target": 2,
            "width": 2,
            "stroke": "black",
            "distance": 80
          },
          {
            "source": 0,
            "target": 3,
            "width": 2,
            "stroke": "black",
            "distance": 80
          },
          {
            "source": 9,
            "target": 0,
            "width": 3,
            "stroke": "black",
            "distance": 80,
            "label": "port: 3000"
          },
          {
            "source": 4,
            "target": 5,
            "width": 2,
            "stroke": "black",
            "distance": 80
          },
          {
            "source": 6,
            "target": 7,
            "width": 2,
            "stroke": "black",
            "distance": 80
          },
          {
            "source": 6,
            "target": 8,
            "width": 2,
            "stroke": "black",
            "distance": 80
          },
          {
            "source": 7,
            "target": 4,
            "width": 4,
            "stroke": "black",
            "distance": 80,
            "dash": 3
          },
          {
            "source": 8,
            "target": 4,
            "width": 4,
            "stroke": "black",
            "distance": 80,
            "dash": 3
          },
          {
            "source": 1,
            "target": 4,
            "width": 4,
            "stroke": "black",
            "distance": 80,
            "dash": 3
          },
          {
            "source": 2,
            "target": 4,
            "width": 4,
            "stroke": "black",
            "distance": 80,
            "dash": 3
          },
          {
            "source": 3,
            "target": 4,
            "width": 4,
            "stroke": "black",
            "distance": 80,
            "dash": 3
          },
          {
            "source": 1,
            "target": 6,
            "width": 4,
            "stroke": "black",
            "distance": 80,
            "dash": 3
          },
          {
            "source": 2,
            "target": 6,
            "width": 4,
            "stroke": "black",
            "distance": 80,
            "dash": 3
          },
          {
            "source": 3,
            "target": 6,
            "width": 4,
            "stroke": "black",
            "distance": 80,
            "dash": 3
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
          "cluster" : 1,
          "name" : "pod: guestbook-controller",
          "radius" : 24,
          "fill": "red"
        },
        { 
          "cluster" : 2,
          "name" : "pod: guestbook-controller",
          "radius" : 24,
          "fill": "green"
        },
        { 
          "cluster" : 3,
          "name" : "pod: guestbook-controller",
          "radius" : 24,
          "fill": "blue"
        },
        { 
          "cluster" : 1,
          "name" : "container: php-redis",
          "radius" : 20,
          "fill": "red"
        },
        { 
          "cluster" : 2,
          "name" : "container: php-redis",
          "radius" : 20,
          "fill": "green"
        },
        { 
          "cluster" : 3,
          "name" : "container: php-redis",
          "radius" : 20,
          "fill": "blue"
        },
        { 
          "cluster" : 4,
          "name" : "pod: redis-master",
          "radius" : 24,
          "fill": "orange"
        },
        { 
          "cluster" : 4,
          "name" : "container: master",
          "radius" : 20,
          "fill": "orange"
        },
        { 
          "cluster" : 5,
          "name" : "pod: redis-worker-controller",
          "radius" : 24,
          "fill" : "goldenrod"
        },
        { 
          "cluster" : 5,
          "name" : "container: slave",
          "radius" : 20,
          "fill" : "goldenrod"
        },
        { 
          "cluster" : 5,
          "name" : "container: slave",
          "radius" : 20,
          "fill" : "goldenrod"
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
