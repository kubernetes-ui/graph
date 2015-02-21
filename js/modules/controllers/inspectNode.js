/**=========================================================
* Module: Graph
* Visualizer for force directed graph
=========================================================*/
(function() {
  'use strict';

  angular.module('krakenApp.Graph').controller(
      'InspectNodeCtrl',
      ['$scope', 'inspectNodeService', function($scope, inspectNodeService) {
        $scope.nodeDetail = inspectNodeService.getDetailData();
  }]);


})();
