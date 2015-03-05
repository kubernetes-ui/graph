/**=========================================================
* Module: Graph
* Visualizer for force directed graph
=========================================================*/
(function() {
  'use strict';

  angular.module('krakenApp.Graph').controller(
      'InspectNodeCtrl',
      ['$scope', 'inspectNodeService', '$location', function($scope, inspectNodeService, $location) {
        var nodeDetail = inspectNodeService.getDetailData();
        $scope.element = nodeDetail.id;
        $scope.metadata = nodeDetail.metadata;

        $scope.backToGraph = function() {
          $location.path('/graph');
          $scope.$apply();
        };
  }]);

})();
