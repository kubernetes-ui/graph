/**=========================================================
* Module: Graph
* Visualizer for force directed graph
=========================================================*/
(function() {
  'use strict';

  angular.module('krakenApp.Graph').controller(
      'InspectNodeCtrl',
      ['$scope', 'inspectNodeService', 'lodash', '$location', function($scope, inspectNodeService, lodash, $location) {
        $scope.nodeDetail = inspectNodeService.getDetailData();
        $scope.nodeDetailString = JSON.stringify($scope.nodeDetail, undefined, 2);

        $scope.backToGraph = function() {
          $location.path('/graph');
          $scope.$apply();
        };
  }]);

})();
