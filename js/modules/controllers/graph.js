/**=========================================================
 * Module: Graph
 * Visualizer for force directed graph
 =========================================================*/
(function() {
	'use strict';

	angular.module('krakenApp.Graph', [])
    .controller('GraphCtrl', ['$scope', 'viewModelService', function($scope, viewModelService) {
    	// Watch the control parameters and the data model, and call the viewModelService when they change.
    	// For now, just call the viewModelService once.
    	$scope.viewModel = viewModelService($scope);
    }]);
})();
