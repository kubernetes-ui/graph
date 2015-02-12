/**=========================================================
* Module: Graph
* Visualizer for force directed graph
=========================================================*/
(function() {
  'use strict';

  var MOCK_SAMPLE_DATA = [
  { 
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
  },
  {
    "nodes": [
    {
      "name": "svc: guestbook",
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
      "name": "svc: redis-master",
      "group": 1,
      "radius": 16
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
      "radius": 16
    }, 
    {
      "name": "svc: redis-worker",
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
      "distance": 160
    }, 
    {
      "source": 0,
      "target": 2,
      "thickness": 2,
      "distance": 160
    }, 
    {
      "source": 0,
      "target": 3,
      "thickness": 2,
      "distance": 160
    }, 
    {
      "source": 1,
      "target": 4,
      "thickness": 1,
      "distance": 240
    }, 
    {
      "source": 2,
      "target": 5,
      "thickness": 1,
      "distance": 240
    }, 
    {
      "source": 3,
      "target": 6,
      "thickness": 1,
      "distance": 240
    }, 
    {
      "source": 7,
      "target": 8,
      "thickness": 2,
      "distance": 160
    }, 
    {
      "source": 8,
      "target": 9,
      "thickness": 1,
      "distance": 240
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
      "distance": 160
    }, 
    {
      "source": 12,
      "target": 13,
      "thickness": 1,
      "distance": 240
    }, 
    {
      "source": 12,
      "target": 14,
      "thickness": 1,
      "distance": 240
    },
    ],
    "settings": {
      "clustered": false,
      "showEdgeLabels": true,
      "showNodeLabels": true
    }
  }];

  angular.module('krakenApp.Graph', ['krakenApp.services'])
  .controller('GraphCtrl', ['$scope', 'viewModelService', 'pollK8sDataService',
    function($scope, viewModelService, pollK8sDataService) {
      // For now, just hardwire the data model contents.
      var dataSamples = MOCK_SAMPLE_DATA;

      // Get the data model wrapper from pollK8sDataService.k8sdatamodel,
      // which can then be passed into viewModelService for the projection (TODO).
      $scope.pollK8sDataService = pollK8sDataService;

      // Watch the configuration and the data model, and generate the view model when they change.
      $scope.viewModelService = viewModelService;

      $scope.$watch("pollK8sDataService.k8sdatamodel.sequenceNumber", function(newValue, oldValue) {
        viewModelService.generateViewModel($scope.pollK8sDataService.k8sdatamodel.data);
      });

      // TODO: Start polling when we go in scope and stop when we go out of scope.
      pollK8sDataService.start();

      // For now, just generate the view model once.
      var nextSample = 0;

      // Dummy function to run through the default data sets.
      var changeDataSet = function() {
        // nextSample = nextSample % dataSamples.length;
        // viewModelService.viewModel.data = dataSamples[nextSample++];
        viewModelService.generateViewModel($scope.pollK8sDataService.k8sdatamodel.data);
      };

      $scope.changeDataSet = changeDataSet;
      // changeDataSet();
  }]);
})();
