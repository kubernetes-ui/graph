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
    		}}
		};
	};

	angular.module('krakenApp.Graph')
	.service('viewModelService', viewModelService);

})();
