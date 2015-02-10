/**=========================================================
 * Module: Graph
 * Visualizer for force directed graph
 =========================================================*/
(function() {
	'use strict';

	angular.module('krakenApp.Graph', ['krakenApp.services'])
    .controller('GraphCtrl', ['$scope', 'viewModelService', 'pollK8sDataService',
                              function($scope, viewModelService, pollK8sDataService) {
    	// Watch the control parameters and the data model, and call the viewModelService when they change.
    	// For now, just call the viewModelService once.

        // We can get the latest data model by calling pollK8sDataService.k8sdatamodel.data,
        // which can then be passed into viewModelService for the projection (TODO).
        var dataModel = pollK8sDataService.k8sdatamodel.data;

    	$scope.viewModel = viewModelService;
    }]);
})();
