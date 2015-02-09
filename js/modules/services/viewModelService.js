/**=========================================================
 * Module: Graph
 * Visualizer for force directed graph
 =========================================================*/
(function() {
	'use strict';

	// Compute the view model based on the data model and control parameters
	// and place the result in the current scope at $scope.viewModel.
	var viewModelService = function ViewModelService() {
		// For now, just hardwire the view model contents.
	  	return { data: {
  			"Clustered" : { 
  				"nodes" : [ 
	  			  { "group" : 1,
		            "name" : "pod: guestbook-controller",
		            "radius" : 24
		          },
		          { "group" : 2,
		            "name" : "pod: guestbook-controller",
		            "radius" : 24
		          },
		          { "group" : 3,
		            "name" : "pod: guestbook-controller",
		            "radius" : 24
		          },
		          { "group" : 1,
		            "name" : "container: php-redis",
		            "radius" : 20
		          },
		          { "group" : 2,
		            "name" : "container: php-redis",
		            "radius" : 20
		          },
		          { "group" : 3,
		            "name" : "container: php-redis",
		            "radius" : 20
		          },
		          { "group" : 4,
		            "name" : "pod: redis-master",
		            "radius" : 24
		          },
		          { "group" : 4,
		            "name" : "container: master",
		            "radius" : 20
		          },
		          { "group" : 5,
		            "name" : "pod: redis-worker-controller",
		            "radius" : 24
		          },
		          { "group" : 5,
		            "name" : "container: slave",
		            "radius" : 20
		          },
		          { "group" : 5,
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
			"AllServices": {
				"nodes": [
				  {
					"name": "svc: guestbook",
					"group": 1,
					"radius": 16
				  }, {
					"name": "pod: guestbook-controller",
					"group": 2,
					"radius": 20
				  }, {
					"name": "pod: guestbook-controller",
					"group": 2,
					"radius": 20
				  }, {
					"name": "pod: guestbook-controller",
					"group": 2,
					"radius": 20
				  }, {
					"name": "container: php-redis",
					"group": 3,
					"radius": 24
				  }, {
					"name": "container: php-redis",
					"group": 3,
					"radius": 24
				  }, {
					"name": "container: php-redis",
					"group": 3,
					"radius": 24
				  }, {
					"name": "svc: redis-master",
					"group": 1,
					"radius": 16
				  }, {
					"name": "pod: redis-master",
					"group": 2,
					"radius": 20
				  }, {
					"name": "container: master",
					"group": 3,
					"radius": 24
				  }, {
					"name": "lb: guestbook",
					"group": 4,
					"radius": 16
				  }, {
					"name": "svc: redis-worker",
					"group": 1,
					"radius": 16
				  }, {
					"name": "pod: redis-worker-controller",
					"group": 2,
					"radius": 20
				  }, {
					"name": "container: slave",
					"group": 3,
					"radius": 24
				  }, {
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
				  }, {
					"source": 0,
					"target": 2,
					"thickness": 2,
					"distance": 160
				  }, {
					"source": 0,
					"target": 3,
					"thickness": 2,
					"distance": 160
				  }, {
					"source": 1,
					"target": 4,
					"thickness": 1,
					"distance": 240
				  }, {
					"source": 2,
					"target": 5,
					"thickness": 1,
					"distance": 240
				  }, {
					"source": 3,
					"target": 6,
					"thickness": 1,
					"distance": 240
				  }, {
					"source": 7,
					"target": 8,
					"thickness": 2,
					"distance": 160
				  }, {
					"source": 8,
					"target": 9,
					"thickness": 1,
					"distance": 240
				  }, {
					"source": 10,
					"target": 0,
					"thickness": 3,
					"distance": 80,
					"label": "port: 3000"
				  }, {
					"source": 11,
					"target": 12,
					"thickness": 2,
					"distance": 160
				  }, {
					"source": 12,
					"target": 13,
					"thickness": 1,
					"distance": 240
				  }, {
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
			}
		  }
		};
	};

	angular.module('krakenApp.Graph')
	.service('viewModelService', viewModelService);

})();
