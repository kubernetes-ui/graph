/**=========================================================
 * Module: Graph
 * Visualizer for force directed graph
 =========================================================*/
 (function() {
   'use strict';

  // Compute the view model based on the data model and control parameters
  // and place the result in the current scope at $scope.viewModel.
  var viewModelService = function ViewModelService() {
    var viewModel = { 
      'data' : { 
        "nodes" : [ 
        { 
          "group" : 1,
          "name" : "no data",
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
      'configuration' : undefined,
      'version' : 0 
    };

    // Generate the view model from a given data model.
    var generateViewModel = function(dataModel) {
      // For now, just set the data model as the view model without changes.
      viewModel.data = dataModel;
      viewModel.version++;
    };

    return {
      'viewModel' : viewModel,
      'generateViewModel' : generateViewModel
    };
  };

  angular.module('krakenApp.Graph')
  .service('viewModelService', viewModelService);

})();
