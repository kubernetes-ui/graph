/**=========================================================
* Module: Graph
* Visualizer for force directed graph
=========================================================*/
(function() {
  'use strict';

  angular.module('krakenApp.Graph').controller(
      'InspectNodeCtrl',
      ['$scope', 'inspectNodeService', function($scope, inspectNodeService) {
        console.log('In inspect node controller: ' + $scope.nodeDetail);
        $scope.nodeDetail = JSON.stringify(inspectNodeService.getDetailData());
  }]);


})();
