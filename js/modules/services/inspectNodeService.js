/**=========================================================
 * Module: Graph
 * Visualizer for force directed graph
 * This is a service that shares node detals data among controllers.
 =========================================================*/

(function() {
  'use strict';

  var inspectNodeService = function() {
    var nodeDetails = null;
    var setDetailData = function(data) {
      nodeDetails = data;
    };

    var getDetailData = function() {
      return nodeDetails;
    };

    return {
      'setDetailData': setDetailData,
      'getDetailData': getDetailData
    };
  };

  angular.module('kubernetesApp.Graph.services', [])
      .factory('inspectNodeService', inspectNodeService);

})();
