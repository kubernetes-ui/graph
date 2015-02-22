/**=========================================================
* Module: Graph
* Visualizer for force directed graph
=========================================================*/
(function() {
  'use strict';

  angular.module('krakenApp.Graph').controller(
      'InspectNodeCtrl',
      ['$scope', 'inspectNodeService', 'lodash', function($scope, inspectNodeService, lodash) {
        // TODO(xinzh): When the data server is up and we have live data, only display
        // the metadata section in the detailed data.
        $scope.nodeDetail = JSON.stringify(inspectNodeService.getDetailData(), undefined, 2);
  }]);

})();
