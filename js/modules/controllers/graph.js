/**=========================================================
* Module: Graph
* Visualizer for force directed graph
=========================================================*/
(function() {
  'use strict';

  angular.module('krakenApp.Graph', ['krakenApp.services'])
  .controller('GraphCtrl', ['$scope', 'viewModelService', 'mockDataService', 'pollK8sDataService',
    function($scope, viewModelService, mockDataService, pollK8sDataService) {
      $scope.pollK8sDataService = pollK8sDataService;
      $scope.viewModelService = viewModelService;

      $scope.$watch("pollK8sDataService.k8sdatamodel.sequenceNumber", function(newValue, oldValue) {
        viewModelService.generateViewModel(pollK8sDataService.k8sdatamodel.data);
      });

      // TODO: Start polling when we go in scope and stop when we go out of scope.
      pollK8sDataService.start();

      var nextSample = 0;
      $scope.nextSample = function() {
        pollK8sDataService.stop();
        nextSample = nextSample % mockDataService.samples.length;
        viewModelService.setViewModel(mockDataService.samples[nextSample++].data);
      };
  }]);
})();
